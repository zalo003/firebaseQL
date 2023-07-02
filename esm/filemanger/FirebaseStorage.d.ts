import { FirebaseApp } from 'firebase/app';
import { UPLOADTYPES } from "../dataTypes/fileupload.types";
export declare class StorageUpload {
    uploadError?: string;
    file?: File | string;
    private additionalPath?;
    private maxSize?;
    fullPath?: string;
    private storage;
    constructor(props: {
        app: FirebaseApp;
        file: File | string;
        reference: UPLOADTYPES;
        uploadCategory: string;
        path?: string;
        maxSize?: number;
    });
    private validateFile;
    private getExtensionName;
    private setUploadError;
    private setFilePath;
    doUpload(): Promise<string | boolean>;
    private uploadAsString;
    private uploadAsFile;
}
