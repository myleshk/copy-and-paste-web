import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export function isOnline(dateString?: string) {
    if (!dateString) return false;

    const obj = dayjs(dateString);
    return dayjs().diff(obj, "seconds") <= 60;
}

export function formatDiffFromJson(dateString?: string) {
    if (!dateString) {
        return null;
    }
    const obj = dayjs(dateString).local();
    if (obj.isAfter(dayjs().local().startOf('day'))) {
        // same day
        return obj.format('hh:mm A');
    }

    if (obj.isAfter(dayjs().local().startOf('year'))) {
        // same year
        return obj.format('M-D hh:mm A');
    }

    return obj.format("YYYY-M-D hh:mm A");
}

export function formatLastSeenFromJson(dateString?: string) {
    if (!dateString) {
        return "unknown";
    }
    const obj = dayjs(dateString).local();
    if (obj.isAfter(dayjs().subtract(1, 'minute'))) {
        return "Online"
    }

    if (obj.isAfter(dayjs().subtract(1, 'hour'))) {
        // active within 1 hour
        return `Last seen ${dayjs().diff(obj, 'minutes')} minutes ago`;
    }

    if (obj.isAfter(dayjs().local().startOf('day'))) {
        // same day
        const diffMinutes = dayjs().diff(obj, 'minutes');
        if (diffMinutes <= 120) {
            return `Last seen more than 1 hour ago`;
        }
        return `Last seen ${Math.round(diffMinutes / 60)} hours ago`;
    }

    return obj.format("Last seen at YYYY-MM-DD");
}