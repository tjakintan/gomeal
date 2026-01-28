export function debounce<F extends (...args: any[]) => any>(func: F, delay: number) {
    let timer: NodeJS.Timeout;
    return (...args: Parameters<F>): Promise<ReturnType<F>> =>
        new Promise(resolve => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(async () => {
                const result = await func(...args);
                resolve(result);
            }, delay);
        });
}
