class Utilts {

    private static _instance: Utilts;

    private constructor() {
    }

    public static getInstance(): Utilts {
        if (!Utilts._instance) Utilts._instance = new Utilts();
        return Utilts._instance;
    }

    public notificationCreator(type: string, message: string) {
        ui.notifications[type](message);
    }
}

export default Utilts.getInstance();