const mongoose = require("mongoose");
const { Schema } = mongoose;

const FormSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    shivdootPhoneNumber: {
      type: String,
      required: true,
    },
    phoneWorking: {
      type: String,
      required: true,
    },
    phoneMappedCorrectly: {
      type: String,
    },
    correctName: {
      type: String,
    },
    interestedInQuestions: {
      type: String,
    },
    gender: {
      type: String,
    },
    assembly: {
      type: String,
    },
    boothNumber: {
      type: String,
    },
    associatedWithShivSena: {
      type: String,
    },
    associationDetails: {
      type: String,
    },
    memberDuration: {
      type: Number,
    },
    awareOfRegistration: {
      type: String,
    }
  },
  { timestamps: true }
);

FormSchema.pre("save", async function () {
  try {
    await this.populate("userId", "email");
    console.log("User Email:", this.userId.email);
  } catch (error) {
    console.error("Error during population:", error);
  }
});

const Form = mongoose.model("Form", FormSchema);

module.exports = Form;
