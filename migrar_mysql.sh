#!/usr/bin/env bash
# migrar_mysql.sh — copia la base MySQL de Aiven a la base MySQL nueva de Coolify (AgroTech).
# Se corre en la VPS por SSH:  bash migrar_mysql.sh
# Es repetible: mysqldump trae DROP TABLE IF EXISTS, así que se puede correr de nuevo
# para la copia final (antes de pasar el nodo al backend nuevo).
set -euo pipefail

MYSQL_VER="${MYSQL_VER:-8}"       # versión del cliente (si Aiven es 9: MYSQL_VER=9 bash migrar_mysql.sh)
DEST_DB="${DEST_DB:-agrotech}"    # nombre de la base en el MySQL de Coolify
DUMP="$HOME/agrotech-dump.sql"

echo "== Migración Aiven MySQL -> VPS (AgroTech) =="
read -r -p "Host de Aiven (ej: mysql-xxxx.aivencloud.com): " AH
read -r -p "Puerto de Aiven: " AP
read -r -p "Usuario de Aiven [avnadmin]: " AU; AU="${AU:-avnadmin}"
read -r -p "Base de Aiven [defaultdb]: " AD; AD="${AD:-defaultdb}"
read -r -s -p "Password de Aiven (no se muestra): " APW; echo
[ -n "$AH" ] && [ -n "$AP" ] && [ -n "$APW" ] || { echo "Faltan datos."; exit 1; }

# Contenedor MySQL nuevo: el que tiene MYSQL_DATABASE=$DEST_DB
DBC=""
for c in $(sudo docker ps --format '{{.Names}}'); do
  if sudo docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$c" 2>/dev/null | grep -x "MYSQL_DATABASE=$DEST_DB" >/dev/null; then
    DBC="$c"; break
  fi
done
[ -n "$DBC" ] || { echo "No encontré el MySQL nuevo (MYSQL_DATABASE=$DEST_DB). Crealo primero en Coolify."; exit 1; }
echo "Base nueva: $DBC"

src() { sudo docker run --rm -e MYSQL_PWD="$APW" "mysql:$MYSQL_VER" "$@"; }

echo "1/4 Bajando el dump de Aiven..."
src mysqldump -h "$AH" -P "$AP" -u "$AU" --ssl-mode=REQUIRED \
  --single-transaction --set-gtid-purged=OFF --no-tablespaces --routines --triggers \
  "$AD" > "$DUMP"
chmod 600 "$DUMP"
TABLAS=$(grep -c '^CREATE TABLE' "$DUMP" || true)
echo "    dump: $(du -h "$DUMP" | cut -f1), $TABLAS tablas"
[ "$TABLAS" -gt 0 ] || { echo "El dump no tiene tablas. No sigo."; exit 1; }

echo
echo "ATENCION: si el backend de Railway sigue recibiendo datos del nodo, lo que llegue"
echo "después de este dump NO entra. Para la copia FINAL, pausá primero el backend en Railway."
read -r -p "¿Importar ahora? (escribi si): " R
[ "$R" = "si" ] || { echo "Cancelado. El dump quedó en $DUMP."; exit 0; }

echo "2/4 Importando en $DBC ..."
sudo docker exec -i "$DBC" sh -c "mysql -uroot -p\"\$MYSQL_ROOT_PASSWORD\" $DEST_DB" < "$DUMP"

echo "3/4 Comparando filas (Aiven / VPS):"
TABS=$(sudo docker exec -i "$DBC" sh -c "mysql -uroot -p\"\$MYSQL_ROOT_PASSWORD\" -N -e \"SHOW TABLES\" $DEST_DB" 2>/dev/null)
for t in $TABS; do
  o=$(src mysql -h "$AH" -P "$AP" -u "$AU" --ssl-mode=REQUIRED -N -e "SELECT COUNT(*) FROM \`$t\`" "$AD" 2>/dev/null || echo "?")
  d=$(sudo docker exec -i "$DBC" sh -c "mysql -uroot -p\"\$MYSQL_ROOT_PASSWORD\" -N -e \"SELECT COUNT(*) FROM \\\`$t\\\`\" $DEST_DB" 2>/dev/null || echo "?")
  mark="OK"; [ "$o" = "$d" ] || mark="REVISAR"
  printf "    %-22s %9s / %-9s %s\n" "$t" "$o" "$d" "$mark"
done

echo "4/4 Listo. Si todo dice OK, seguí con el backend en Coolify."
