const mongoose = require('mongoose');
const { Schema } = mongoose;

const DatasetSchema = new Schema(
  {
    district: { type: String },
    pc: { type: String },
    acName: { type: String },
    acNumber: { type: Number },
    taluka: { type: String },
    boothNumber: { type: String },
    boothName: { type: String },
    boothPramukhName: { type: String},
    boothPramukhContactNumber: { type: String},
    boothPramukhGender: { type: String },
    shivdootName: { type: String },
    shivdootContactNumber: { type: String },
    shivdootGender: { type: String },
    zone: { type: String },
    shownTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    isUsed: { type: Boolean, default: false },
    formFilled: { type: String, enum: ['Yes', 'No'], default: 'No' },
    callingStatus: {
      type: String,
      enum: [
        '',
        'Answered',
        'Invalid number',
        'Not answered',
        'Switch off',
        'Not interested',
      ],
      default: '',
    },
    updatedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      userName: { type: String },
    },
  },
  { timestamps: true }
);

const Dataset = mongoose.model('dataset', DatasetSchema);

module.exports = Dataset;
