"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const Base_model_1 = require("./Base.model");
class UserModel extends Base_model_1.BaseModel {
    constructor() {
        super(...arguments);
        this.table = 'users';
    }
}
exports.UserModel = UserModel;
//# sourceMappingURL=Users.model.js.map