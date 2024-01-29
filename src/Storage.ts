import { FirebaseApp } from "firebase/app"
import { FirebaseStorage, getStorage, ref, StorageReference, uploadString, getDownloadURL, uploadBytesResumable } from "firebase/storage"
import { UPLOADTYPES } from "./constants"
import { errorLogger, generateRandomString } from "./helpers"

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
        this.maxSize = maxSize ?? 1000000
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
            errorLogger(this.uploadError)
            return false
       }else{
            try {
                const reference = ref(this.storage, this.fullPath);
                if(typeof(this.file)==='string'){
                    return await this.uploadAsString(reference)
                }else{
                    return await this.uploadAsFile(reference)
                }
            } catch (error) {
                errorLogger("doUpload: ", error)
                return false
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
            errorLogger("UploadAsString: ", error)
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
            errorLogger("uploadAsFile: ", error)
            return false
        }
    }
}