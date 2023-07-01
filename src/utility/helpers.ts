

/**
 * Generates random strings of n length
 * containing 0-9 and Aa-Zz
 * @param length 
 * @returns 
 */
export const generateRandomString = (length: number): string => {
    if(length > 40){
        throw new Error(`Maximum generatable character is 40, ${length} was required`)
    }
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

/**
 * converts number to money format of comma 
 * separated thousands
 * @param x 
 * @returns 
 */
export const moneyFormatter = (x:number):string => {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
