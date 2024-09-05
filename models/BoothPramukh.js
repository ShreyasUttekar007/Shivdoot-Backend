const mongoose = require("mongoose");
const { Schema } = mongoose;

const BoothPramukhSchema = new Schema(
  {
    phoneNumber: {
      type: String,
      required: true,
    },
    callingStatus: {
      type: String,
      required: true,
    },
    phoneMappedCorrectly: {
      type: String,
    },
    correctName: {
      type: String,
    },
    gender: {
      type: String,
    },
    assembly: {
      type: String,
    },
    boothPramukh: {
      type: String,
    },
    boothNumber: {
      type: String,
    },
    boothCommittee: {
      type: String,
    },
    committeeMembers: {
      type: String,
    },
    preparationRating: {
      type: String,
    },
    oppositionParty: {
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

BoothPramukhSchema.pre("save", async function () {
  try {
    await this.populate("userId", "email");
    console.log("User Email:", this.userId.email);
  } catch (error) {
    console.error("Error during population:", error);
  }
});

const BoothPramukh = mongoose.model("boothpramukh", BoothPramukhSchema);

module.exports = BoothPramukh;
