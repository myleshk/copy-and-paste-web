import dayjs from "dayjs";

const DEFAULT_FORMAT = "YYYY-MM-DD hh:mmA";

export function formatFromJson(dateString: string) {
    return dayjs(dateString).format(DEFAULT_FORMAT);
}

export function formatFromDate(date: Date) {
    return dayjs(date).format(DEFAULT_FORMAT);

}