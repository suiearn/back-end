const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/user");
const { isValidId } = require("./isValidId");
const Verification = require("../models/verification");
const { sendEmail } = require("../helpers/sendEmail");

const sendVerificationEmail = async (userId) => {
  try {
    isValidId(userId);
    const user = await User.findById(userId);
    if (!user) {
      throw Error("user does not exist");
    }
    if (user.isVerified) {
      throw Error("user verified");
    }

    await Verification.findOneAndDelete({
      userId: userId,
    });
    const uniqueString = uuidv4() + userId;
    const hashedUniqueString = await bcrypt.hash(uniqueString, 10);
    const newVerification = await Verification.create({
      userId: userId,
      hashedUniqueString: hashedUniqueString,
      expiresAt: Date.now() + 24 * (60 * 60 * 1000),
    });

    const verificationLink = `${process.env.CLIENT_URL}/verify-email/${userId}?token=${uniqueString}`;
    const payload = {
      message: `<p>Verify your email address to complete the signup process</p></br><p>This link <b>expires in 24 hours</b></p> </br> <p>Click <a href=${verificationLink}>here</a> to proceed</p>`,
      subject: "Verify your Email",
    };
    await sendEmail(user.email, payload.subject, payload.message);
    return {
      message: `Verification email sent to ${user.email}`,
      verificationToken: uniqueString,
    };
  } catch (error) {
    throw Error("Unable to send verification link");
  }
};

module.exports = { sendVerificationEmail };
