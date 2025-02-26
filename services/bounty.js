const Bounty = require("../models/bounty");
const Submission = require("../models/submission");
const mongoose = require("mongoose");

const createBounty = async (creator, bountyData) => {
  try {
    const {
      title,
      description,
      reward,
      startDate,
      endDate,
      about,
      eligibility,
      requirements,
      procedure,
    } = bountyData;
    if (!mongoose.Types.ObjectId.isValid(creator)) {
      throw new Error("Invalid creator ID");
    }
    if (startDate > endDate) {
      throw new Error("Start date cannot be after end date");
    }

    if (
      !title ||
      !description ||
      !reward ||
      !startDate ||
      !endDate ||
      !about ||
      !eligibility ||
      !requirements ||
      !procedure
    ) {
      throw new Error(
        "Title, description, Start Date, End Date, about, eligibility, requirements, procedure and reward are required"
      );
    }
    const bounty = new Bounty({
      title,
      description,
      reward,
      startDate,
      endDate,
      status: "OPEN",
      createdBy: creator,
      about,
      eligibility,
      requirements,
      procedure,
    });
    await bounty.save();
    return bounty;
  } catch (error) {
    throw new Error(`Failed to create bounty: ${error.message}`);
  }
};

const updateBounty = async (bountyId, updateData) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(bountyId)) {
      throw new Error("Invalid bounty ID");
    }

    const bounty = await Bounty.findById(bountyId);
    if (!bounty) {
      throw new Error("Bounty not found");
    }

    if (updateData.startDate && updateData.endDate) {
      if (updateData.startDate > updateData.endDate) {
        throw new Error("Start date cannot be after end date");
      }
    }

    if (updateData.reward && parseFloat(updateData.reward) <= 0) {
      throw new Error("Reward must be a positive number");
    }

    const updatedBounty = await Bounty.findByIdAndUpdate(
      bountyId,
      { $set: updateData },
      { new: true }
    ).populate("createdBy", "username firstName lastName email");

    return updatedBounty;
  } catch (error) {
    throw new Error(`Failed to update bounty: ${error.message}`);
  }
};

const getAllBounties = async (filters = {}) => {
  try {
    const query = {};

    if (filters.title) {
      query.title = { $regex: filters.title, $options: "i" };
    }
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.createdBy) {
      query.createdBy = filters.createdBy;
    }
    if (filters.minReward) {
      query.reward = { $gte: parseFloat(filters.minReward) };
    }

    const bounties = await Bounty.find(query).populate(
      "createdBy",
      "username firstName lastName email"
    );
    return bounties;
  } catch (error) {
    throw new Error(`Failed to fetch bounties: ${error.message}`);
  }
};

const getBountyById = async (id) => {
  try {
    const bounty = await Bounty.findById(id).populate(
      "createdBy",
      "username firstName lastName email"
    );
    if (!bounty) {
      throw new Error("Bounty not found");
    }
    return bounty;
  } catch (error) {
    throw new Error(`Failed to fetch bounty: ${error.message}`);
  }
};

const submitBountyAnswer = async (bountyId, payload) => {
  try {
    const bounty = await Bounty.findById(bountyId);
    if (!bounty) {
      throw new Error("Bounty not found");
    }

    if (bounty.status === "COMPLETED") {
      throw new Error("Cannot submit answer to a completed bounty");
    }

    if (new Date() > bounty.endDate) {
      throw new Error("Bounty submission period has ended");
    }

    const { solution, wallet, userIds } = payload;

    if (!solution || !wallet || !userIds || !Array.isArray(userIds)) {
      throw new Error(
        "Solution, wallet, userIds, and userIds array are required"
      );
    }

    const existingSubmission = await Submission.findOne({
      bounty: bountyId,
      users: { $in: userIds },
    });

    if (existingSubmission) {
      throw new Error(
        "One or more users have already submitted an answer for this bounty"
      );
    }

    const submission = new Submission({
      bounty: bountyId,
      users: userIds,
      solution,
      wallet,
    });

    await submission.save();

    bounty.submissions.push(submission._id);

    if (bounty.status === "OPEN") {
      bounty.status = "IN_PROGRESS";
    }

    await bounty.save();

    const populatedSubmission = await Submission.findById(submission._id)
      .populate("users", "name email")
      .populate("bounty", "title reward");

    return {
      message: "Bounty answer submitted successfully",
      submission: populatedSubmission,
    };
  } catch (error) {
    throw new Error(`Failed to submit bounty answer: ${error.message}`);
  }
};

module.exports = {
  getAllBounties,
  getBountyById,
  submitBountyAnswer,
  createBounty,
  updateBounty,
};
