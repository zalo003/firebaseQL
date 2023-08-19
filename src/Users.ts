import { Auth, setPersistence, browserSessionPersistence, signInWithEmailAndPassword, signInWithPhoneNumber,  ApplicationVerifier, updatePassword, sendPasswordResetEmail, signOut, ConfirmationResult, getMultiFactorResolver, User, multiFactor, PhoneAuthProvider, MultiFactorResolver, PhoneMultiFactorGenerator } from 'firebase/auth'
import { BaseModel } from './BaseModel'
import { MFAVerifier, QueryReturn } from './constants'

export class Users extends BaseModel {

     /**
     * confirm user is valid and get their information
     * from firestore users table if exists
     * @param { string , string, boolean} credentials - login credentials 
     * @returns {Promise<QueryReturn>}
     */
     async login ({email, password, auth, persist = false}: {email: string, password: string, auth: Auth,  persist?: boolean}): Promise<QueryReturn> {
        let result : QueryReturn = {result: undefined, status: false}
        
        try {
            // persist user in session
            if(persist){
                await setPersistence(auth, browserSessionPersistence)
            }
            // verify user's email and password is correct
            const userAuth = await signInWithEmailAndPassword(auth, email, password)
            if(userAuth){
                result.status = true
                // find user in table
                result.result =  userAuth.user
            }
        } catch (error) {
            result.error = error
        }

        return result
    }

    /**
     * sign user with user's number
     * @param param0 
     * @returns 
     */
    async signInWithPhoneNumber({auth, phoneNumber, appVerifier}: {auth: Auth, phoneNumber: string, appVerifier: ApplicationVerifier}): Promise<ConfirmationResult | boolean> {
        try {
            // persist user in session
            return await signInWithPhoneNumber(auth, phoneNumber, appVerifier)
        } catch (error) {
            throw new Error(`Unable to send message: , ${error}`)
        }
    }

    // /**
    //  * confirm One time password sent to users
    //  * @param code 
    //  * @returns 
    //  */
    // async confirmOTP(code: string, confirmationResult: ConfirmationResult): Promise<boolean> {
    //     if(confirmationResult){
    //         const user = await confirmationResult.confirm(code)
    //         if(user){
    //             return true
    //         } else {
    //             return false
    //         }
    //     }
    //     return false
    // }

    /**
     * Check if user is currently logged in
     * @param auth 
     * @returns 
     */

    isLoggedIn(auth: Auth): boolean {
        try {
            if(auth.currentUser){
                return true
            } else {
                return false
            }
        } catch (error) {
            throw new Error("Connection error!")
        }
    }

    /**
     * Reset logged in user's password
     * @param {Auth, string} param0 
     * @returns {boolean}
     */
    async resetPassword({auth, newPassword}: {auth: Auth, newPassword: string}): Promise<boolean>{
        try {
            await updatePassword(auth.currentUser!, newPassword)
            return true
        } catch (_) {
            return false
        }
    }

    /**
     * send password reset message to user's email address
     * @param param0 
     * @returns 
     */
    async sendPasswordResetMessage({auth, email} : {auth: Auth, email: string}): Promise<boolean>{
        try {
            await sendPasswordResetEmail(auth, email)
            return true
        } catch (_) {
            return false
        }
    }

    /**
     * logout users and end current session
     * @param param0 
     * @returns 
     */
    async logout({auth}: {auth: Auth}): Promise<boolean>{
        try {
            await signOut(auth)
            return true
        } catch (_) {
            return false
        }
    }

     /**
    * create and validate users
    * @param param0 
    */
   async loginWithMultiAuthFactor({email, password, auth, recaptcha, persist = true}: 
    {email: string, password: string, auth: Auth, recaptcha: ApplicationVerifier, persist?: boolean}): Promise<MFAVerifier | null>{
        
        try {
            // persist user in session
            if(persist){
                await setPersistence(auth, browserSessionPersistence)
            }
            // sign in user
            const credential = await signInWithEmailAndPassword(auth, email, password)
            if(credential){
                // user is not MFA enabled
                // enroll user with multi-factor auth if user is admin
                const verificationId = await this.setMultiFactorEnrollment(credential.user, recaptcha, auth)
                if(verificationId){
                    return {verificationId, user: credential.user}
                } else {
                    // unable to send message
                    return null
                }
            } else {
                // user does not exist
                return null
            }            
        } catch (e) {
            const error = e as any
            if (error.code === 'auth/multi-factor-auth-required') {
                // The user is a multi-factor user. Second factor challenge is required.
                const resolver = getMultiFactorResolver(auth, error);
                return await this.sendOTP(resolver, recaptcha, auth)
            } 
            return null
        }
   }

 /**
     * send OTP to enable 2 factor authentication
     * @param user 
     * @param recaptchaverifier 
     */
 private setMultiFactorEnrollment = async (user: User, recaptchaverifier: ApplicationVerifier, auth: Auth): Promise<string | null> =>{
    try {
        // get session
        const multifactorSession = await multiFactor(user).getSession()
        // specify the phone number and pass the MFA session
        const phoneInfoOptions = {
            phoneNumber: user.phoneNumber,
            session: multifactorSession
        };
        const phoneAuthProvider = new PhoneAuthProvider(auth);
        // Send SMS verification code.
       return await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, recaptchaverifier);
    } catch (_) {
        return null
    }
}

/**
     * complete user signIn process with OTP
     * @param param0 
     * @param userCode 
     * @param user 
     * @param onSuccess 
     */
confirmOTP = async (verifier: MFAVerifier, userCode: string): Promise<User | null> =>{
    try {
        const { verificationId, resolver} = verifier
         // Ask user for the verification code. Then:
         const cred = PhoneAuthProvider.credential(verificationId, userCode);
         const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);

         let user: User | null = null
         // Complete enrollment.
         if(resolver){
            const credential = await resolver.resolveSignIn(multiFactorAssertion)
            user = credential.user
         } else {
            if(verifier.user){
                // set up multifactor authentication
                await multiFactor(verifier.user).enroll(multiFactorAssertion, "primary phone")
                user = verifier.user
            } 
         }
         return user
    } catch (error) {
        // otp is not correct
        return null
    }
}

/**
 * send OTP to member
 * @param resolver 
 * @param recaptchaVerifier 
 * @param setter 
 * @returns 
 */
private sendOTP =  async (resolver: MultiFactorResolver, recaptchaVerifier: ApplicationVerifier, auth: Auth) : Promise<MFAVerifier | null> =>{
    try {
        if (resolver.hints[0].factorId ===
            PhoneMultiFactorGenerator.FACTOR_ID) {
            const phoneInfoOptions = {
                multiFactorHint: resolver.hints[0],
                session: resolver.session
            };
            const phoneAuthProvider = new PhoneAuthProvider(auth);
            // Send SMS verification code
            const verificationId = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, recaptchaVerifier)
            return {verificationId, resolver}
        } else {
            // other auth factor managed to be first 
            return null
        } 
    } catch (_) {
        return null
    }
}


}
