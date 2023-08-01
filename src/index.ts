import { doc, collection, 
    QueryDocumentSnapshot, DocumentData, 
    DocumentReference, CollectionReference, onSnapshot, where, 
    QueryConstraint, orderBy, startAfter, limit, query, getDoc, 
    updateDoc, getDocs, addDoc, setDoc, deleteDoc, increment, 
    getCountFromServer, Firestore, WriteBatch , WhereFilterOp
} from "firebase/firestore";
import {FirebaseApp} from 'firebase/app'
import { FirebaseStorage, getDownloadURL, getStorage, ref, StorageReference, uploadBytesResumable, uploadString } from "firebase/storage";
import { Auth, setPersistence, browserSessionPersistence, signInWithEmailAndPassword, signInWithPhoneNumber,  ApplicationVerifier, updatePassword, sendPasswordResetEmail, signOut, ConfirmationResult } from 'firebase/auth'

// firebase storage test
export const fbsession = /^firebase:authUser:/

/**
 * firebase where clause
 */
export type whereClause = {
    key: string,
    operator: WhereFilterOp,
    value: any
}

export enum UPLOADTYPES {
    IMAGES = 'images',
    DOCUMENTS = 'documents',
    VIDEOS = 'videos'
}


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

export type dbItems = {
    reference?: string
}

interface Model {
 
     // fetch single item
     find(id: string): Promise<DocumentData | boolean>
 
     // select all from database
     findAll(): Promise<DocumentData[]>
 
     // find item by where clause
     findWhere({wh, lim, order, offset} : 
         {
             wh?:  whereClause[], 
             lim?:number, 
             order?:string,
             offset?: string
         }): Promise<DocumentData[]>
 
     /**
      * Save data to database,
      * create new data if does not exists
      * and update data if already exists
      */
     save(data: object, id?: string ):  Promise<string | boolean>
 
     /**
      * Delete an item from database
      */
     delete(id: string): Promise<boolean>
 
     /**
      * Update part of data
      * @param data 
      */
     update(data: object, id:string): Promise<boolean>
 
     /**
      * Realtime data listener
      * @param where 
      */
     stream(callBack: (data: DocumentData | DocumentData[])=>void, errorHandler: (error?: unknown)=>void, id?: string, ):  void
 
     /**
      * Stream data with where clause
      * @param wh 
      * @param callBack 
      * @param errorHander 
      * @param lim 
      * @param order 
      */
     streamWhere(wh: whereClause[], callBack: (data: DocumentData[])=>void,  errorHander: (error?: unknown)=>void, lim?:number, order?: string, offset?: string): void 
 
     /**
      * count data in database
      * @param qyery 
      * @param isAll 
      */
     countData(where: whereClause[]): Promise<number>
 
 
     /**
      * create multiple documents
      * @param param0 
      */
     saveBatch({data}:{data: object[]}): Promise<boolean>
 
     /**
      * Update multiple documents
      * @param param0 
      */
     updateBatch({data}:{data: object[], callBack:()=>void, errorHandler:(error?: any)=>void}): Promise<boolean>


     login ({email, password, auth, persist = false}: {email: string, password: string, auth: Auth,  persist?: boolean}): Promise<QueryReturn>

     /**
      * send otp to users
      * @param param0 
      */
     sendOTP({auth, phoneNumber, appVerifier}: {auth: Auth, phoneNumber: string, appVerifier: ApplicationVerifier }): Promise<ConfirmationResult | boolean>

    /**
     * confirm One time password sent to users
     * @param code 
     * @param confirmationResult 
     */
    confirmOTP(code: string, confirmationResult: ConfirmationResult): Promise<boolean>

    /**
     * Check if user is currently logged in
     * @param auth 
     * @returns 
     */

    isLoggedIn(auth: Auth): boolean 

    /**
     * Reset logged in user's password
     * @param {Auth, string} param0 
     * @returns {boolean}
     */
    resetPassword({auth, newPassword}: {auth: Auth, newPassword: string}): Promise<boolean>

    /**
     * send password reset message to user's email address
     * @param param0 
     * @returns 
     */
    sendPasswordResetMessage({auth, email} : {auth: Auth, email: string}): Promise<boolean> 

    /**
     * logout users and end current session
     * @param param0 
     * @returns 
     */
    logout({auth}: {auth: Auth}): Promise<boolean>
 
     /**
      * Delete multiple documents
      * @param param0 
      */
     deleteBatch({ids}:{ids: string[]}): Promise<boolean>
 
     incrementDecrement({dbReference, key, isIncrement = true, incrementalValue}: 
         {dbReference: string, key:string, isIncrement?:boolean, incrementalValue?: number} ): Promise<boolean>
 }

export class StorageUpload {


    uploadError?: string
    // private fileUrl?: string
    file?: File | string
    private additionalPath?: string
    private maxSize?: number
    fullPath?: string
    private storage: FirebaseStorage

    constructor(props: {app: FirebaseApp, file: File | string, reference: UPLOADTYPES, uploadCategory: string, path?: string, maxSize?: number}){
        const {file,  reference, uploadCategory, path, maxSize, app} = props
        // storage object
        this.storage =  getStorage(app);
       if(file){
        // set user additional path
        this.additionalPath = path
        this.maxSize = maxSize ?? 10000
        // set file globally
        this.file = file
         // validate file
         this.validateFile(file, reference, uploadCategory)
       }
    }


    // validate file (size, type)
    private validateFile = (file: File | string, storageRef: UPLOADTYPES, uploadCategory: string): void =>{
        let goodSize: boolean = false
        let goodType: boolean = false
        let extension = ''
        if(typeof(file)!=='string'){
            if(storageRef===UPLOADTYPES.IMAGES){
                extension = this.getExtensionName(file.type)
                goodType = file.type==='image/png' || file.type==='image/jpg' || file.type==='image/jpeg'
            }else if(storageRef===UPLOADTYPES.DOCUMENTS){
                goodType = file.type === 'application/pdf'
            }else if(storageRef===UPLOADTYPES.VIDEOS){
                goodType = file.type==='video/mp4'
            }
            goodSize =  file.size > 0 && file.size <= this.maxSize!
        }else{
            goodType = true
            goodSize = true
        }
        
        // check and set error messages
        if(!goodSize || !goodType){
            this.setUploadError(storageRef, this.maxSize ?? 1000000, goodSize)
        }else{
            // set file name and path
            this.setFilePath(storageRef, uploadCategory, extension)
        }
    }

    /**
     * Get human readable form for file size
     * @param size 
     * @returns 
     */
    private sizeMetric = (size: number): string =>{
        let result = `${size} bytes`
        if(size <= 999999){
            result =  `${Math.round(size/1000)} Kb`
        } else if(size <= 999999999){
            result = `${Math.round(size/1000000)} Mb`
        } else if (size <= 999999999999){
            result = `${Math.round(size/1000000000)} Gb`
        } else if (size <= 999999999999999){
            result = `${Math.round(size/1000000000000)} T`
        }
        return result;
    }

    /**
     * Get file extensions
     * @param fileType 
     * @returns 
     */
    private getExtensionName = (fileType: string): string =>{
        let ext = ''
        if(fileType==='image/png'){
            ext = 'png'
        }
        if(fileType==='image/jpg'){
            ext = 'jpg'
        }
        if(fileType==='image/jpeg'){
            ext = 'jpeg'
        }
        return ext
    }



    /**
     * setting error messages for failed file validation
     * @param ref 
     * @param maxSize 
     * @param isGoodSize 
     * @param isGoodType 
     */
    private setUploadError = (ref: UPLOADTYPES, maxSize: number, isGoodSize: boolean): void => {
        this.uploadError = !isGoodSize ? `File size is must not be larger than ${this.sizeMetric(maxSize)}` :
            `File is not a valid ${
                (ref===UPLOADTYPES.IMAGES ? "image" : (ref===UPLOADTYPES.DOCUMENTS? 'document': 'video'))
            }`
    }

    // generate new file name and extension
    private setFilePath = (ref: UPLOADTYPES, category?: string, ext?: string): void => {
        const d = new Date()
        const fileExtension:string = ref===UPLOADTYPES.IMAGES?'.'+ext:(ref===UPLOADTYPES.DOCUMENTS?'.pdf':'.mp4')
        const fileName = generateRandomString(30)
        this.fullPath = ref.concat(`/`, 
            typeof(category)==='undefined'?'':`${category}/`, 
            typeof(this.additionalPath)==='undefined'?'':`${this.additionalPath}/`, 
            `${fileName}_${d.getTime()}${fileExtension}`)
    }

    /**
     * Upload images, documents and videos
     * @param progressMonitor 
     */
    async doUpload(): Promise<string | boolean> {
       if(this.uploadError){
            return false
       }else{
        const reference = ref(this.storage, this.fullPath);
            if(typeof(this.file)==='string'){
                return await this.uploadAsString(reference)
            }else{
                return await this.uploadAsFile(reference)
            }
                
       }
    }

    /**
     * upload base64 data_url
     * @param reference 
     */
    private uploadAsString = async (reference: StorageReference): Promise<string | boolean>=>{
        try {
            const result = await uploadString(reference, this.file! as string, 'data_url')
            if(result){
                // get the url
                return await getDownloadURL(ref(this.storage, result.ref.fullPath))
            } else {
                return false
            }
        } catch (error) {
            return false
        }
    }

    /**
     * upload blobs and files
     * @param reference 
     */
    private uploadAsFile = async (reference: StorageReference): Promise<string | boolean> =>{
        try {
            const snapShot = await uploadBytesResumable(reference, this.file! as File)
            if(snapShot){
                return await getDownloadURL(ref(this.storage, this.fullPath!))
            } else {
                return false
            }
        } catch (error) {
            return false
        }
    }
}

export class BaseModel implements Model {

    protected firestorDB?: Firestore
    // Get a new write batch
    protected batch?: WriteBatch

    // Database table name
    protected table: string = '';

    // offset data
    offset?: QueryDocumentSnapshot<DocumentData>;


    /**
     * save multiple documents
     * @param param0 
     */
    async saveBatch ({ data }: { data: object[]}): Promise<boolean> {
        const obj = data as dbItems[]
        obj.forEach((document)=>{
            const docRef = document.reference? 
            doc(this.firestorDB!, this.table, document.reference): 
            doc(collection(this.firestorDB!, this.table))
            if(document.reference){
                delete document.reference
            }
            
            this.batch!.set(docRef, document)
        })
        return await this.batch!.commit().then(()=>true).catch((e)=>{
            throw new Error(`Unable to saveBatch ${e}`)
        })
    }

    /**
     * update multiple documents
     * @param param0 
     */
    async updateBatch({ data }: { data: object[] }): Promise<boolean> {
        const obj = data as dbItems[]
        obj.forEach((document)=>{
            const docRef = doc(this.firestorDB!, this.table, document.reference!)
            delete document.reference
            this.batch!.update(docRef, document as object)
        })
        return await this.batch!.commit().then(()=>true).catch((e)=>{
            throw new Error(`Unable to updateBatch: ${e}`)
        })
    }

    /**
     * delete multiple documents
     * @param param0 
     */
    async deleteBatch({ ids }: { ids: string[]  }): Promise<boolean> {
        ids.forEach((id)=>{
            const docRef = doc(this.firestorDB!, this.table, id)
            this.batch!.delete(docRef)
        })
        return await this.batch!.commit().then(()=>true).catch((e)=>{
            throw new Error(`Unable to deleteBatch: ${e}`)
        })
    }



    /**
     * Get realtime update from the database
     * @param id 
     */
    stream(callBack: (data:  DocumentData | DocumentData[])=>void, errorHandler:(error?: unknown)=>void, id?: string ): void { 
    
        const ref:DocumentReference<DocumentData> | CollectionReference<DocumentData> = id? 
            doc(this.firestorDB!, this.table, id):
            collection(this.firestorDB!, this.table)
        try {
                if(id){
                    onSnapshot(ref as DocumentReference, (doc) => {
                        callBack({...doc.data()!, reference: ref.id})
                    })
                }else{
                    onSnapshot(ref as CollectionReference, (snapShot) => {
                        callBack(
                            snapShot.docs.map((value)=>{
                                const data = {...value.data(), reference: value.id}
                                return data
                            })
                        )
                    })
                }
        } catch (error) {
            errorHandler(error)
        }
    }

    /**
     * Get realtime value from database with where clause
     * @param wh 
     * @param lim 
     * @param order 
     */
    async streamWhere(wh: whereClause[], callBack: (data: DocumentData[])=>void,  errorHander: (error?: unknown)=>void, lim?:number, order?: string, offset?: string): Promise<void> {
        const whereParameter = wh.map(clause=> where(
            clause.key, 
            clause.operator, 
            clause.value))
        let constraint: QueryConstraint[] = []
        // add where parameter
        if(wh){
            constraint.push(...whereParameter)
        }
        // add order by
        if(order){
            constraint.push(orderBy(order))
        }
        // add offset
        if(offset){
            const off  =  await getDoc(doc(this.firestorDB!, offset));
            constraint.push(startAfter(off))
        }
        // add limit
        if(lim){
            // 
            constraint.push(limit(lim))
        }
        const ref: CollectionReference<DocumentData> = collection(this.firestorDB!, this.table, )
        try {
                onSnapshot(query(
                    ref,  
                    ...constraint
                ), (snapShot) => {
                    callBack(snapShot.docs.map((value)=>{
                        const data = {...value.data(), reference: value.id}
                        return data
                    }))
                })
        } catch (error) {
                errorHander(error)
        }
    }

    /**
     * Fetch a single item from database
     * @param id 
     */
    async find(id: string ): Promise<DocumentData | boolean> {
        try {
            const ref = doc(this.firestorDB!, this.table, id)
            const docSnap = await getDoc(ref)
            if (docSnap.exists()) {
                return {...docSnap.data(), reference: ref.id}
            } 
            return false
        } catch (error) {
            throw new Error(`Unable to find: ${error}`)
        }
    }

    /**
     * Update part of a data
     * @param data 
     * @param id 
     * @returns 
     */
    async update(data: object, id: string): Promise<boolean> {
        const docRef = doc(this.firestorDB!, this.table, id)
        return await updateDoc(docRef, data)
        .then(()=>true).catch((e)=>{
            throw new Error(`Unable to update: ${e}`)
        })
    }

    /**
     * Get all items from database
     * @returns void
     */
    async findAll() : Promise<DocumentData[]> {
        try {
            const snaptshots =  await getDocs(collection(this.firestorDB!, this.table))
            if(!snaptshots.empty){
                return snaptshots.docs.map((document)=>{
                    return {...document.data(), reference: document.id}
                })
            }else{
                return []
            }
        } catch (error) {
            throw new Error(`Cannot findAll: ${error}`)
        }
    }

    /**
     * perform complex query
     * @param param0 
     */
    async findWhere( {wh, lim, order, offset}:  {wh?: whereClause[], lim?:number, order?:string, offset?: string}): Promise<DocumentData[]> {
        // get Collection reference
        const colRef = collection(this.firestorDB!, this.table)
        // set where clause
        const whereParameter = wh?wh.map(clause=> where(
            clause.key, 
            clause.operator, 
            clause.value)):[]
        let constraint: QueryConstraint[] = []
        // add where parameter
        if(wh){
            constraint.push(...whereParameter)
        }
        // add order by
        if(order){
            constraint.push(orderBy(order))
        }
        // add offset
        if(offset){
            const off  =  await getDoc(doc(this.firestorDB!, offset));
            constraint.push(startAfter(off))
        }
        // add limit
        if(lim){
            constraint.push(limit(lim))
        }
        // fetch data
        try {
            const snapshot = await getDocs(
                query(
                    colRef,  
                    ...constraint
                )
            )
            if(!snapshot.empty){
                return snapshot.docs.map(document=>{
                    return {...document.data(), reference: document.id}
                })
            }else{ return [] }
            
        } catch (error) {
            throw new Error(`Unable to findWhere: ${error}`)
        }
    }

    /**
     * create or update data
     * @param data 
     */
    async save(data: object, id?: string | undefined): Promise<string | boolean> {
        try {
            if(id===undefined){
                const documentRef = await addDoc(collection(this.firestorDB!, this.table), data)
                return documentRef.id
            } else {
                await setDoc(doc(this.firestorDB!, this.table, id!), data).then(()=>id).catch((e)=>{
                    throw new Error(`Unable to save: ${e}`)
                })
                return id!
            }
                    
        } catch (error) {
            return false
        }
    }

    /**
     * Delete document from database
     * @param id 
     */
    async delete(id: string): Promise<boolean> {
        return await deleteDoc(doc(this.firestorDB!, this.table, id)).then(()=>true).catch(error=>{
            throw new Error(`Unable to delete: ${error}`)
        })
    }

    /**
     * Increment or decrement counters
     * @param param0 
     */
    async incrementDecrement({dbReference, key, isIncrement = true, incrementalValue}: 
        {dbReference: string, key:string, isIncrement?:boolean, incrementalValue?: number}): Promise<boolean>{
        const docRef = doc(this.firestorDB!, this.table, dbReference)
        const value = isIncrement?incrementalValue??1:(incrementalValue??1) * -1
        return await updateDoc(docRef, {[key]: increment(value)})
        .then(()=>true).catch((e)=>{
            throw new Error(`Unable to incrementDecrement: ${e}`)
        })
    }

    /**
     * Count data in database
     * @param {whereClause[]} wh - query parameter (e.g. [
     * {
     *  key: string,
     * value: any,
     * operator: == , !=, >, < etc
     * }]) 
     */
    async countData(wh: whereClause[]): Promise<number> {

        // set parameter
        const qryParameter = wh.map(clause=> where(
            clause.key, 
            clause.operator, 
            clause.value))

        const qry = query(
            collection(this.firestorDB!, this.table),  
            ...qryParameter
        )
        return await getCountFromServer(qry).then((agg)=>{
            return agg.data().count
        }).catch((e)=>{
            throw new Error(`Unable to countData: ${e}`)
        })
    }

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
     * send OTP to verify user's number
     * @param param0 
     * @returns 
     */
    async sendOTP({auth, phoneNumber, appVerifier}: {auth: Auth, phoneNumber: string, appVerifier: ApplicationVerifier}): Promise<ConfirmationResult | boolean> {
        try {
            // persist user in session
            return await signInWithPhoneNumber(auth, phoneNumber, appVerifier)
        } catch (error) {
            throw new Error(`Unable to send message: , ${error}`)
        }
    }

    /**
     * confirm One time password sent to users
     * @param code 
     * @returns 
     */
    async confirmOTP(code: string, confirmationResult: ConfirmationResult): Promise<boolean> {
        if(confirmationResult){
            const user = await confirmationResult.confirm(code)
            if(user){
                return true
            } else {
                return false
            }
        }
        return false
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

export type FunctionReturn = {
    data: any
}

export enum AUTH_PROVIDERS {
    GOOGLE,
    APPLE,
    FACEBOOK,
    TWITTER
}

export type QueryReturn = {
    result: any,
    status: boolean,
    error?: any
}
