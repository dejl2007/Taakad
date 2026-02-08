# MRZ Document Scanner Integration

This implementation adds support for Machine Readable Zone (MRZ) document scanning using Dynamosoft Capture Vision Bundle.

## Installation

To use the MRZ scanner features, you need to install the Dynamosoft libraries:

```bash
npm install dynamsoft-capture-vision-bundle dynamsoft-code-parser
```

## Setup

### 1. Get Dynamosoft License

- Visit [Dynamosoft](https://www.dynamsoft.com)
- Sign up for a trial or commercial license
- You'll receive a license key

### 2. Assets Configuration

Download the Dynamosoft resources and place them in your public assets folder:

```
public/
├── assets/
│   ├── dynamsoft-capture-vision-bundle/
│   └── dynamsoft-capture-vision-data/
```

Also download the MRZ template and place it in assets:

```
public/
└── assets/
    └── template.json
```

### 3. Environment Configuration

Add your Dynamosoft license to `.env`:

```env
VITE_DYNAMOSOFT_LICENSE=YOUR_LICENSE_KEY
```

### 4. Initialize License in App

In your main app file, initialize the Dynamosoft license before using components:

```typescript
import { CoreModule, License } from 'dynamsoft-capture-vision-bundle';

// Initialize license
License.setDeviceId('your-device-id');
License.setLicenseKey('YOUR_LICENSE_KEY');
```

## Components

### MRZReader
- File-based document scanning
- Upload passport/ID card images
- Automatic MRZ extraction
- Located in: `client/src/components/MRZReader.tsx`

### MRZScanner
- Camera-based real-time scanning
- Live document detection
- Multiple camera support
- Located in: `client/src/components/MRZScanner.tsx`

## Supported Document Types

- TD1 National ID Card
- TD2 National ID Card  
- TD2 French ID Card
- TD2 Visa
- TD3 Passport
- TD3 Visa

## Features

- Automatic MRZ detection
- Text extraction and parsing
- Information parsing:
  - Name, Surname, Given Names
  - Date of Birth
  - Passport/Document Number
  - Nationality
  - Gender
  - Expiry Date
  - Issuing Country

## Integration

The MRZ scanner is integrated into the Issue Identity page with three modes:

1. **Form Mode** - Manual data entry
2. **Scan Document** - Upload document image
3. **Camera** - Real-time camera scanning

## Troubleshooting

### "Dynamosoft not initialized"
- Ensure all required libraries are installed
- Check that assets are in the correct location
- Verify license key is set

### "No MRZ detected"
- Ensure document is clearly visible
- Good lighting is essential
- Document should fill most of the frame
- Try a different document image

### Camera issues
- Grant camera permissions when prompted
- Check browser console for specific errors
- Try a different camera if available

## Notes

- First time setup requires Dynamosoft license
- Extracted data is encrypted before storage
- No data is sent to external services
- All processing happens client-side
