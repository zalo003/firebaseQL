"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageUpload = void 0;
const storage_1 = require("firebase/storage");
const fileupload_types_1 = require("../dataTypes/fileupload.types");
const helpers_1 = require("../utility/helpers");
class StorageUpload {
    constructor(props) {
        this.validateFile = (file, storageRef, uploadCategory) => {
            let goodSize = false;
            let goodType = false;
            let extension = '';
            if (typeof (file) !== 'string') {
                if (storageRef === fileupload_types_1.UPLOADTYPES.IMAGES) {
                    extension = this.getExtensionName(file.type);
                    goodType = file.type === 'image/png' || file.type === 'image/jpg' || file.type === 'image/jpeg';
                }
                else if (storageRef === fileupload_types_1.UPLOADTYPES.DOCUMENTS) {
                    goodType = file.type === 'application/pdf';
                }
                else if (storageRef === fileupload_types_1.UPLOADTYPES.VIDEOS) {
                    goodType = file.type === 'video/mp4';
                }
                goodSize = file.size > 0 && file.size <= this.maxSize;
            }
            else {
                const f = file;
                goodType = true;
                goodSize = f.size <= this.maxSize;
            }
            if (!goodSize || !goodType) {
                this.setUploadError(storageRef);
            }
            else {
                this.setFilePath(storageRef, uploadCategory, extension);
            }
        };
        this.getExtensionName = (fileType) => {
            let ext = '';
            if (fileType === 'image/png') {
                ext = 'png';
            }
            if (fileType === 'image/jpg') {
                ext = 'jpg';
            }
            if (fileType === 'image/jpeg') {
                ext = 'jpeg';
            }
            return ext;
        };
        this.setUploadError = (ref) => {
            if (ref === fileupload_types_1.UPLOADTYPES.IMAGES) {
                this.uploadError = 'Image format is not supported';
            }
            else if (ref === fileupload_types_1.UPLOADTYPES.DOCUMENTS) {
                this.uploadError = 'Documents must be a pdf file and must not be larger than 1Mb';
            }
            else if (ref === fileupload_types_1.UPLOADTYPES.VIDEOS) {
                this.uploadError = 'Videos cannot be larger than 20Mb and must be an mp4 format';
            }
            else {
                this.uploadError = 'File format is not allowed';
            }
        };
        this.setFilePath = (ref, category, ext) => {
            const d = new Date();
            const fileExtension = ref === fileupload_types_1.UPLOADTYPES.IMAGES ? '.' + ext : (ref === fileupload_types_1.UPLOADTYPES.DOCUMENTS ? '.pdf' : '.mp4');
            const fileName = (0, helpers_1.generateRandomString)(30);
            this.fullPath = ref.concat(`/`, typeof (category) === 'undefined' ? '' : `${category}/`, typeof (this.additionalPath) === 'undefined' ? '' : `${this.additionalPath}/`, `${fileName}_${d.getTime()}${fileExtension}`);
        };
        this.uploadAsString = async (reference) => {
            try {
                const result = await (0, storage_1.uploadString)(reference, this.file, 'data_url');
                if (result) {
                    return await (0, storage_1.getDownloadURL)((0, storage_1.ref)(this.storage, result.ref.fullPath));
                }
                else {
                    return false;
                }
            }
            catch (error) {
                return false;
            }
        };
        this.uploadAsFile = async (reference) => {
            try {
                const snapShot = await (0, storage_1.uploadBytesResumable)(reference, this.file);
                if (snapShot) {
                    return await (0, storage_1.getDownloadURL)((0, storage_1.ref)(this.storage, this.fullPath));
                }
                else {
                    return false;
                }
            }
            catch (error) {
                return false;
            }
        };
        const { file, reference, uploadCategory, path, maxSize, app } = props;
        this.storage = (0, storage_1.getStorage)(app);
        if (file) {
            this.additionalPath = path;
            this.maxSize = maxSize !== null && maxSize !== void 0 ? maxSize : 10000;
            this.file = file;
            this.validateFile(file, reference, uploadCategory);
        }
    }
    async doUpload() {
        if (this.uploadError) {
            return false;
        }
        else {
            const reference = (0, storage_1.ref)(this.storage, this.fullPath);
            if (typeof (this.file) === 'string') {
                return await this.uploadAsString(reference);
            }
            else {
                return await this.uploadAsFile(reference);
            }
        }
    }
}
exports.StorageUpload = StorageUpload;
//# sourceMappingURL=FirebaseStorage.js.map