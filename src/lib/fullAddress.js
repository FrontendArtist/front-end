/** هم‌تراز با fullAddressRule در استرپی؛ کوتاه‌تر از این را پستکس نمی‌پذیرد. */
export const MIN_FULL_ADDRESS_LENGTH = 10;
export const SHORT_FULL_ADDRESS_MESSAGE = 'نشانی باید حداقل ۱۰ نویسه باشد (خیابان، کوچه و پلاک).';

export function isFullAddressLongEnough(value) {
    return typeof value === 'string' && value.trim().length >= MIN_FULL_ADDRESS_LENGTH;
}
