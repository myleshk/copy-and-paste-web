import User from "@/models/user";

const USER = "ME";

export function loadMe(): User|null {
    try {
        const me = JSON.parse(sessionStorage.getItem(USER) ?? "null");
        console.log("Loaded user from storage:", me);
        return me;
    } catch (error: any) {
        console.error(error);
        return null;
    }
}

export function saveMe(user: User) {
    sessionStorage.setItem(USER, JSON.stringify(user));
}