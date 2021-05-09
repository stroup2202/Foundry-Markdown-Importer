class Utilts {
    notificationCreator(type, message) {
        ui.notifications[type](message);
    }
}

export default Utilts.getInstance();