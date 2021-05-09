const notificationCreator = (type, message) => {
    ui.notifications[type](message);
}


export {notificationCreator}