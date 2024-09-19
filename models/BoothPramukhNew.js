const mongoose = require("mongoose");
const { Schema } = mongoose;

const BoothPramukhNewSchema = new Schema(
  {
    phoneNumber: {
      type: String,
      required: true,
    },
    callingStatus: {
      type: String,
      required: true,
    },
    effectivenessScale: {
      type: String,
    },
    beneficiariesCount: {
      type: String,
    },
    performanceScale: {
      type: String,
    },
    assembly: {
      type: String,
    },
    membersEnrolled: {
      type: String,
    },
    boothNumber: {
      type: String,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      required: true,
    }
  },
  { timestamps: true }
);

BoothPramukhNewSchema.pre("save", async function () {
  try {
    await this.populate("userId", "email");
    console.log("User Email:", this.userId.email);
  } catch (error) {
    console.error("Error during population:", error);
  }
});

const BoothPramukh = mongoose.model("boothpramukhnew", BoothPramukhNewSchema);

module.exports = BoothPramukh;
