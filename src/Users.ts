import { 
        Auth, 
        setPersistence, 
        browserSessionPersistence, 
        signInWithEmailAndPassword, 
        signInWithPhoneNumber,  
        ApplicationVerifier, 
        updatePassword, 
        sendPasswordResetEmail, 
        signOut, 
        ConfirmationResult, 
        getMultiFactorResolver, 
        User, 
        multiFactor, 
        PhoneAuthProvider, 
        MultiFactorResolver, 
        PhoneMultiFactorGenerator, 
        createUserWithEmailAndPassword, 
        sendEmailVerification, 
        applyActionCode, 
        verifyPasswordResetCode, 
        deleteUser,
} from 'firebase/auth'
import { BaseModel } from './BaseModel'
import { MFAVerifier, QueryReturn, dbItems } from './constants'
import { errorLogger } from './helpers'

export class Users extends BaseModel {

    private user?: User
    protected table: string = 'users';

    /**
     * register user and send email verification
     * delete user if registration is not successful
     * @param param0 
     */
    async registerWithEmailAndPassword ({auth, email, password, userData }: {auth: Auth, email:string, password: string, userData?: dbItems }): Promise<boolean> {
        try {
            // create firebase user with email and password
            const credential = await createUserWithEmailAndPassword(auth, email, password)
            this.user = credential.user
            
            // send verification email
            sendEmailVerification(credential.user)
            // create firestore document
            if(userData){
                await this.save(userData, credential.user.uid)
            }
            return true
        } catch (error) {
            // delete account
            if(this.user){
                this.deleteAccount(this.user)
            }
            errorLogger("registerWithEmailAndPassword error: ", error)
            return false
        }
    }

     /**
     * confirm user is valid and get their information
     * from firestore users table if exists
     * @param { string , string, boolean} credentials - login credentials 
     * @returns {Promise<QueryReturn>}
     */
     async login ({email, password, auth, persist = false, verifyEmail = false}: 
        {email: string, password: string, auth: Auth,  persist?: boolean, verifyEmail?: boolean}): Promise<QueryReturn> {

        let result : QueryReturn = {result: undefined, status: false}
        
        try {
            // persist user in session
            if(persist){
                await setPersistence(auth, browserSessionPersistence)
            }
            // verify user's email and password is correct
            const userAuth = await signInWithEmailAndPassword(auth, email, password)
            if(userAuth){
                if(verifyEmail && !userAuth.user.emailVerified){
                    await this.sendEmailVerification(userAuth.user)
                    result.status = false
                    result.error = "Email is not verified"
                } else {
                    result.status = true
                    // find user in table
                    result.result =  userAuth.user
                }
            }
        } catch (error) {
            errorLogger("login error: ", error)
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
            errorLogger("signInWithPhoneNumber error: ", error)
            return false
        }
    }


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
            errorLogger("isLoggedIn error: ", error)
            return false
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
        } catch (e) {
            errorLogger("resetPassword error: ", e)
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
        } catch (e) {
            errorLogger("sendPasswordResetMessage error: ", e)
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
        } catch (e) {
            errorLogger("logout error: ", e)
            return false
        }
    }

     /**
    * create and validate users
    * @param param0 
    */
   async loginWithMultiAuthFactor({email, password, auth, recaptcha, phoneNumber, persist = true, verifyEmail = false}: 
    {email: string, password: string, auth: Auth, recaptcha: ApplicationVerifier, phoneNumber?:string, persist?: boolean, verifyEmail?: boolean}): Promise<MFAVerifier | null>{
        
        try {
            // persist user in session
            if(persist){
                await setPersistence(auth, browserSessionPersistence)
            }
            // sign in user
            const credential = await signInWithEmailAndPassword(auth, email, password)
            if(credential){
                // user is required to verify their email address
                if(verifyEmail && !credential.user.emailVerified){
                    await this.sendEmailVerification(credential.user)
                    throw new Error("Email is not verified")
                }
                const user = phoneNumber? {...credential.user, phoneNumber}: credential.user
                // user is not MFA enabled
                // enroll user with multi-factor auth if user is admin
                const verificationId = await this.setMultiFactorEnrollment(user, recaptcha, auth)
                if(verificationId){
                    return {verificationId, user}
                } else {
                    // unable to send message
                    return null
                }
            } else {
                // user does not exist
                return null
            }            
        } catch (e) {
            // user needs to verify their email address
            if(verifyEmail && !auth.currentUser?.emailVerified){
                await this.sendEmailVerification(auth.currentUser!)
                throw new Error("Email is not verified")
            }
            errorLogger("loginWithMultiAuthFactor error: ", e)
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
        } catch (e) {
            errorLogger("setMultiFactorEnrollment error: ", e)
            return null
        }
    }

    /**
     * complete user signIn process with OTP
     * @param param0 
     * @param userCode 
     * @param user 
     * @param onSuccess 
     * @returns {User | null}
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
            errorLogger("confirmOTP error: ", error)
            return null
        }
    }

    /**
     * send OTP to member
     * @param resolver 
     * @param recaptchaVerifier 
     * @param setter 
     * @returns {MFAVerifier | null}
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
        } catch (e) {
            errorLogger("sendOTP error: ", e)
            return null
        }
    }

    /**
     * Handle email verification for user
     * @param auth 
     * @param actionCode 
     * @returns {error: string | null}
     */
    verifyEmail = async (auth: Auth, actionCode: string): Promise<string | null> => {
        try {
            // parameter.
            // Try to apply the email verification code.
            await applyActionCode(auth, actionCode)
            return null
        } catch (error) {
            errorLogger("verifyEmail error: ", error)
            return "Code is invalid or expired. Ask the user to verify their email address"
        }
    }

    /**
     * confirm that password reset link is correct
     * @param auth 
     * @param actionCode 
     * @returns {email: string | null} 
     */
    verifyPasswordResetLink = async (auth: Auth, actionCode:string) : Promise<string | null> => {
        try {
            return await verifyPasswordResetCode(auth, actionCode)
        } catch (error) {
            errorLogger("verifyPasswordResetLink error: ", error)
            return null
        }
    }

    /**
     * delete user account
     * @param user 
     */
    async deleteAccount(user: User) {
        await deleteUser(user)
        await this.delete(user.uid)
    }

    /**
     * resend email verification for expired link
     * @param auth 
     * @returns 
     */
    async sendEmailVerification(user: User): Promise<string | null> {
        // fetch current user from auth and resend email verification
        try {
            if(user){
                sendEmailVerification(user)
                return null
            } else {
                return "Unknown user account, please sign up!"
            }
        } catch (error) {
            return "Unable to send verification, contact Administrators!"
        }
    }
}

// mAuth.sendPasswordResetEmail(email)
//   .addOnSuccessListener(new OnSuccessListener() {
//       public void onSuccess(Void result) {
//         // send email succeeded
//       }
//    }).addOnFailureListener(new OnFailureListener() {
//       public onFailure(Exception e)
//         // something bad happened
//       }
//    });
