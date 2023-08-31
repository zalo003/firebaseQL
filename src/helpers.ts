import { fbsession } from "./constants";

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
 * Check if firebase session is still active
 * @returns {string | null}
 */
export const getSessionKey = (): string | null =>{
    const sess = window.sessionStorage as object
		const sessKeys = Object.keys(sess)
		const ses = sessKeys.find(item => fbsession.test(item))
    if(typeof(ses)!=='undefined'){
      return ses
    }
    return null
}

// check if environment is production or development
export const isDevelopment = window.location.hostname==='localhost'
// export const baseUrl = isDevelopment ? 'http://localhost:3000'? undefined

export const errorLogger = (error: any, ...optionalParams: any[])=>{
  if(isDevelopment){
    console.log(error, optionalParams)
  }
}

