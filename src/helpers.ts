import { redirect } from "react-router-dom";
import { fbsession } from "./constants";

/**
 * Generates random strings of n length
 * containing 0-9 and Aa-Zz
 * @param length
 * @returns 
 */
export const generateRandomString = (length: number): string => {
    if(length > 60){
        throw new Error(`Maximum generatable character is 60, ${length} was required`)
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
export const getFirebaseSessionKey = (method: 'local' | 'session'): string | null =>{
    const sess = method==='session'? window.sessionStorage: window.localStorage as object
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


/**
 * page redirect
 * @param pageUrl 
 * @returns 
 */
export const pageRedirect = async (pageUrl: string) => {
    return redirect(`/${pageUrl}`);
}


/**
 * 
 * @param 
 * @returns 
 */
export const getUrlParams = (): object =>{
  const urlParams = new URLSearchParams(window.location.search);
  return Object.fromEntries(urlParams)
}

/**
 * converts camel cases to title case
 * @param key 
 * @returns 
 */
export const camelToTitleCase = (key: string): string => {
  // convert first letter to uppercase
  const topic = key[0].toUpperCase()+key.slice(1)

  let result = ''
  let i = 0
  // add spacing to other letters
  while(i < topic.length){
      if(i===0){
          result+=topic.charAt(i)
      } else {
          if(topic.charAt(i)===topic.charAt(i).toUpperCase()){
              result+=` ${topic.charAt(i)}`
          }else{
              result+=topic.charAt(i)
          }
      }
      i++
  }
  return result
}


export const getCurrentLocation = ():string =>{
  const currentPath:string = window.location.pathname
  // convert path to array
  const pathArr = currentPath.split('/')
  return pathArr[1]
}


/**
* format unicode characters
* @param input 
* @returns 
*/
export function convertUnicode(input: string) {
  return input.replace(/\\+u([0-9a-fA-F]{4})/g, (a,b) =>
    String.fromCharCode(parseInt(b, 16)));
}

/**
* converts number to money format of comma 
* separated thousands
* @param x 
* @returns 
*/
export const moneyFormatter = (x:number | string, shorten:boolean = true, decimailPlaces?: number):string => {
  if(x===undefined){
    return ""
  }
  const base: number = 1000000
  // number is less than a million
  const num = parseInt(x as string)
  if(num < base || !shorten){
      return num.toFixed(decimailPlaces).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }else{
      let val = ''
      // check number is less than a billion
      if(num < (base * 1000)){
          val = (num/base).toFixed(decimailPlaces) + "M"
      }else{
          val = (num/(base * 1000)).toFixed(decimailPlaces) + "B"
      }
      return val
  }
}
