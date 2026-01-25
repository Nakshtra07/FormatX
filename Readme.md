# Amarika

Amarika is a web-based document formatting tool that helps users instantly clean up and standardise their documents. By simply pasting a Google Docs link or uploading a `.docx` file, Amarika reformats the document and returns a polished, structured version — without manual editing.

Originally conceptualized as a browser extension, Amarika currently exists as a deployed website built for a hackathon, with plans to expand into a full-fledged web extension in the future.

**Live Website:**  
https://amarika.v1ggs.lol/

---

## What Amarika Does

- Accepts a Google Docs link or a DOCX file  
- Extracts document content and structure  
- Automatically applies consistent formatting  
- Outputs a formatted Google Doc  
- Refreshing the original link shows the formatted document  
- Allows users to upload a pre-made DOCX file as a custom template  

---

## Key Features

- **Google Docs Integration**  
  Paste a Google Docs link and get it reformatted instantly.

- **DOCX Support**  
  Upload `.docx` files for formatting or use them as custom templates.

- **Custom Templates**  
  Use an existing DOCX file to define formatting rules and apply them to other documents.

- **Instant Formatting**  
  Formatting happens almost immediately with minimal wait time.

- **Google Authentication**  
  Secure access using Google Sign-In.

- **Web-Based**  
  No installation required — works directly from the browser.

---

## How It Works (High Level)

1. User signs in using Google Authentication  
2. User pastes a Google Docs link or uploads a DOCX file  
3. Amarika extracts the document content and structure  
4. Formatting rules (default or custom template) are applied  
5. The original document link now points to the formatted version  

---

## Tech Stack

### Frontend
- HTML  
- CSS  
- JavaScript  
- React.js  

### Backend
- Python  
- Flask  

### Authentication
- Google OAuth  

### Hosting
- Deployed (cloud-hosted)

---

## Target Audience

- Students  
- Researchers  
- Professionals  
- Content creators  

Amarika is built for anyone who works with documents and wants clean, consistent formatting without manual effort.

---

## Project Status

This project was built as part of a hackathon and is currently deployed as a website.  
Some sections, such as local setup and configuration, are intentionally left incomplete at this stage.

---

## Future Integrations & Roadmap

Planned ideas for future versions of Amarika include:

- Full browser extension (Chrome, Edge, Firefox)  
- Support for additional output formats (PDF, DOCX download)  
- More advanced custom template controls  
- Team-based document formatting  
- Formatting previews and analytics  
- Optional AI-assisted formatting suggestions  
- Public API access for developers  

---

## License

This project currently does not use an open-source license.
