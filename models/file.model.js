const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  data: { type: Buffer, required: true },
  contentType: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Reference to the user who uploaded the file
});

const File = mongoose.model('File', fileSchema);

module.exports = File;
