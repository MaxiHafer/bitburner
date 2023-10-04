
export function formatTime(ms: number): string {
    let seconds = Math.floor((ms / 1000) % 60);
    let minutes = Math.floor((ms / (1000 * 60)) % 60);
    let time = '';

    if (minutes > 0) {
        time += minutes + "m,";
        ms -= minutes * (1000 * 60);
    }
    if (seconds > 0) {
        time += seconds + "s";
        ms -= seconds * 1000;
    }

    return time
}