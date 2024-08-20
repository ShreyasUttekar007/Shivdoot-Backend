const mongoose = require("mongoose");
const { Schema } = mongoose;

const DatasetSchema = new Schema(
  {
    district: { type: String, required: true },
    pc: { type: String, required: true },
    acName: { type: String, required: true },
    acNumber: { type: Number, required: true },
    taluka: { type: String, required: true },
    boothNumber: { type: String, required: true },
    boothName: { type: String, required: true },
    boothPramukhName: { type: String, required: true },
    boothPramukhContactNumber: { type: String, required: true },
    boothPramukhGender: { type: String, required: true },
    shivdootName: { type: String, required: true },
    shivdootContactNumber: { type: String, required: true },
    shivdootGender: { type: String, required: true },
    zone: { type: String, required: true },
    shownTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
    isUsed: { type: Boolean, default: false },
    formFilled: { type: String, enum: ["Yes", "No"], default: "No" },
    callingStatus: {
      type: String,
      enum: [
        "",
        "Answered",
        "Invalid number",
        "Not answered",
        "Switch off",
        "Not interested",
      ],
      default: "",
    },
  },
  { timestamps: true }
);

const Dataset = mongoose.model("dataset", DatasetSchema);

module.exports = Dataset;
