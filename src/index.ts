import { StorageUpload } from "./filemanger/FirebaseStorage";
import { BaseModel } from "./models/Base.model";
import { UserModel } from "./models/Users.model";

export class Base extends BaseModel {}

export class Users extends UserModel {}

export class Uploader extends StorageUpload {}