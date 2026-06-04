"""Optimizador de cosecha: curva de maduración Brix/pH y ventana óptima de vendimia."""


def _brix(reg):
    for k in ("uva_brix", "brix", "uva_grados_brix", "Uva_Grados_Brix"):
        if reg.get(k) is not None:
            return float(reg[k])
    return 20.0


def _ph(reg):
    for k in ("uva_ph", "ph", "Uva_pH"):
        if reg.get(k) is not None:
            return float(reg[k])
    return 3.1


class HarvestOptimizer:
    def __init__(self):
        self.TARGET_BRIX_MIN, self.TARGET_BRIX_MAX = 23.5, 25.0
        self.TARGET_PH_MIN, self.TARGET_PH_MAX = 3.35, 3.50

    def analyze_ripening(self, history: list) -> dict:
        if not history or len(history) < 5:
            return {
                "status": "MONITORING",
                "estimated_days_to_harvest": None,
                "wine_quality_potential": "UNDETERMINED",
                "current_brix": round(_brix(history[-1]), 1) if history else 20.0,
                "current_ph": round(_ph(history[-1]), 2) if history else 3.1,
                "message": "Se requieren más datos para proyectar la curva de maduración.",
            }

        first, current = history[0], history[-1]
        cb, fb = _brix(current), _brix(first)
        cp, fp = _ph(current), _ph(first)
        n = len(history)

        brix_velocity = max(0.01, (cb - fb) / n)
        ph_velocity = max(0.001, (cp - fp) / n)

        remaining = self.TARGET_BRIX_MIN - cb
        cycles = 0 if remaining <= 0 else remaining / brix_velocity
        days = max(0, int(cycles / 24))
        projected_ph = cp + (ph_velocity * cycles)

        if self.TARGET_BRIX_MIN <= cb <= self.TARGET_BRIX_MAX:
            if self.TARGET_PH_MIN <= cp <= self.TARGET_PH_MAX:
                status, quality = "HARVEST_NOW", "ULTRA_PREMIUM"
                msg = "¡Equilibrio perfecto! Relación azúcar/acidez óptima para alta gama."
            else:
                status, quality = "ALERT_ACIDITY", "RESERVA"
                msg = "Azúcar óptimo pero pH fuera de rango. Cosechar pronto para preservar acidez."
        elif cb > self.TARGET_BRIX_MAX:
            status, quality = "PAST_OPTIMAL", "TABLE_WINE_OR_FORTIFIED"
            msg = "Uva sobremadura: alto azúcar / alcohol potencial, acidez deprimida."
        else:
            status, quality = "MATURING", "EVOLVING"
            msg = f"Acumulando azúcares y polifenoles. Ventana estimada en {days} días."

        return {
            "current_brix": round(cb, 1),
            "current_ph": round(cp, 2),
            "estimated_days_to_harvest": days,
            "projected_ph_at_harvest": round(projected_ph, 2),
            "status": status,
            "wine_quality_potential": quality,
            "metrics_balance": {
                "brix_target_range": f"{self.TARGET_BRIX_MIN} - {self.TARGET_BRIX_MAX}",
                "ph_target_range": f"{self.TARGET_PH_MIN} - {self.TARGET_PH_MAX}",
            },
            "message": msg,
        }
