import pdf from 'pdf-parse';

// Extract text from PDF buffer
export const extractTextFromPdf = async (buffer) => {
  try {
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
};

// Validate that PDF can be parsed to text
export const validatePdfParsability = async (buffer) => {
  try {
    const data = await pdf(buffer);
    
    // Check if we can extract meaningful text
    if (!data.text || data.text.trim().length === 0) {
      return false;
    }

    // Check if text is mostly garbage characters (indicates scanned/image PDF)
    const meaningfulChars = data.text.replace(/[^a-zA-Z0-9]/g, '').length;
    const totalChars = data.text.length;
    
    // If less than 30% of characters are alphanumeric, it's probably not parsable
    if (meaningfulChars / totalChars < 0.3) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating PDF:', error);
    return false;
  }
};

// Get PDF metadata
export const getPdfMetadata = async (buffer) => {
  try {
    const data = await pdf(buffer);
    return {
      pages: data.numpages,
      info: data.info,
      metadata: data.metadata,
      version: data.version,
    };
  } catch (error) {
    console.error('Error getting PDF metadata:', error);
    throw new Error('Failed to get PDF metadata');
  }
};
