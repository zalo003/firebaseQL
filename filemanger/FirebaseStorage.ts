import {FirebaseApp} from 'firebase/app'
import { FirebaseStorage, getDownloadURL, getStorage, ref, StorageReference, uploadBytesResumable, uploadString } from "firebase/storage";
import { UPLOADTYPES } from "../dataTypes/fileupload.types";
import { generateRandomString } from '../utility/helpers';

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
            const f = file as unknown as File
            goodType = true
            goodSize = f.size <= this.maxSize!
        }
        
        // check and set error messages
        if(!goodSize || !goodType){
            this.setUploadError(storageRef)
        }else{
            // set file name and path
            this.setFilePath(storageRef, uploadCategory, extension)
        }
    }

    /**
     * Get file extensions
     * @param fileType 
     * @returns 
     */
    private getExtensionName = (fileType: string): string =>{
        // file.type==='image/png' || file.type==='image/jpg' || file.type==='image/jpeg'
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
     * @param category 
     * @param ref 
     */
    private setUploadError = (ref: UPLOADTYPES): void => {
        if(ref===UPLOADTYPES.IMAGES){
            this.uploadError = 'Image format is not supported'
        }else if(ref===UPLOADTYPES.DOCUMENTS){
            this.uploadError = 'Documents must be a pdf file and must not be larger than 1Mb'
        }else if(ref===UPLOADTYPES.VIDEOS){
           this.uploadError = 'Videos cannot be larger than 20Mb and must be an mp4 format'
        }else{
            this.uploadError = 'File format is not allowed'
        }

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