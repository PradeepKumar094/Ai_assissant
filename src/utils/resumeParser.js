// Mock resume parser - in a real application, you would use a library like pdf-parse
// or integrate with a service that can extract text from PDFs/DOCX files

// Lightweight, browser-ready parsing using pdfjs-dist and mammoth browser build
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import * as mammoth from 'mammoth/mammoth.browser';
GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.149/build/pdf.worker.min.mjs';

const isPDF = (file) => file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');
const isDOCX = (file) => file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name?.toLowerCase().endsWith('.docx');

async function extractTextFromPDF(arrayBuffer) {
  const typedArray = new Uint8Array(arrayBuffer);
  const loadingTask = getDocument(typedArray);
  const pdf = await loadingTask.promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
}

async function extractTextFromDOCX(arrayBuffer) {
  const { value } = await mammoth.extractRawText({ arrayBuffer });
  return value || '';
}

class ResumeParser {
  static async parse(file) {
    // Prefer structured extraction via pdfjs/mammoth when possible
    let fullText = '';
    if (isPDF(file) || isDOCX(file)) {
      const arrayBuffer = await file.arrayBuffer();
      fullText = isPDF(file) ? await extractTextFromPDF(arrayBuffer) : await extractTextFromDOCX(arrayBuffer);
    } else {
      // Fallback to plain text
      fullText = await file.text();
    }
    const text = fullText.replace(/\r\n?/g, '\n');

    let name = this.extractName(text);
    const email = this.extractEmail(text);
    const phone = this.extractPhone(text);

    if (!name && email) {
      const local = email.split('@')[0];
      const guess = local.replace(/[._-]+/g, ' ').trim();
      if (guess && /[a-zA-Z]/.test(guess)) {
        name = guess.split(' ').map(this.toTitleCase).join(' ');
      }
    }

    return { name: name || '', email: email || '', phone: phone || '' };
  }
  
  static extractName(text) {
    const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
    // Strong signals
    for (const line of lines.slice(0, 15)) {
      const m1 = line.match(/^(name|full\s*name)[:\-\s]+(.{2,60})$/i);
      if (m1 && m1[2]) {
        const val = m1[2].replace(/\s{2,}/g, ' ').trim();
        if (!/[\d@]/.test(val)) return val;
      }
      // Split headers like "John Doe | React Developer"
      if (line.includes('|') || line.includes('•') || line.includes('-')) {
        const firstToken = line.split(/[|•\-]+/)[0].trim();
        if (firstToken && !/[\d@]/.test(firstToken)) {
          const words = firstToken.split(/\s+/);
          if (words.length >= 2 && words.length <= 5) {
            const caps = words.filter(w => /^[A-Z][a-z'\-]+$/.test(w));
            if (caps.length >= 2) return words.map(this.toTitleCase).join(' ');
          }
        }
      }
    }
    // Heuristic: first prominent line without digits/urls and with 2+ words capitalized
    for (const line of lines.slice(0, 25)) {
      if (/[\d@]|http|www\./i.test(line)) continue;
      const words = line.split(/\s+/).filter(Boolean);
      if (words.length >= 2 && words.length <= 5) {
        const capsWords = words.filter(w => /^[A-Z][a-z'\-]+$/.test(w));
        if (capsWords.length >= 2) return words.join(' ');
      }
    }
    return '';
  }
  
  static extractEmail(text) {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;
    const match = text.match(emailRegex);
    return match ? match[0] : '';
  }
  
  static extractPhone(text) {
    const cleaned = text.replace(/\s+/g, ' ');
    const patterns = [
      /(\+\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/,
      /(\+\d{1,3}[\s.-]?)?\d{10,15}/
    ];
    for (const p of patterns) {
      const m = cleaned.match(p);
      if (m) {
        // Normalize spaces/hyphens
        return m[0].replace(/\s+/g, ' ').trim();
      }
    }
    return '';
  }

  static toTitleCase(word) {
    if (!word) return word;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }
}

export default ResumeParser;