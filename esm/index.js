"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Uploader = exports.Users = exports.Base = void 0;
const FirebaseStorage_1 = require("./filemanger/FirebaseStorage");
const Base_model_1 = require("./models/Base.model");
const Users_model_1 = require("./models/Users.model");
class Base extends Base_model_1.BaseModel {
}
exports.Base = Base;
class Users extends Users_model_1.UserModel {
}
exports.Users = Users;
class Uploader extends FirebaseStorage_1.StorageUpload {
}
exports.Uploader = Uploader;
//# sourceMappingURL=index.js.map