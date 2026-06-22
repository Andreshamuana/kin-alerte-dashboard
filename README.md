# kin-alerte-dashboard
Tableau de bord d'administration de Kin Alerte
# KinAlerte Dashboard

Tableau de bord de supervision en temps réel pour l'application KinAlerte (alerte proches, chauffeurs, courses).

## 🔧 Configuration

1. Renseignez vos clés Firebase dans `js/config.js`.
2. Ouvrez `index.html` ou déployez sur GitHub Pages.

## 📊 Données

- Alertes SOS : `emergency_alerts` (status = 'active')
- Courses : `rides` (status = 'in_progress' ou 'driver_arriving')
- Utilisateurs : `users` (isOnline = true)
- Chauffeurs : `driver_locations` (is_online = true)
- Notifications : `notifications` (limitée aux 20 derniers)

## 🔥 Mode simulation

Si Firebase n'est pas configuré, passez `dataMode: 'simulation'` dans `config.js`.
