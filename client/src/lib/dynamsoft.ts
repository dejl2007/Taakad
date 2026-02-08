// Dynamosoft initialization and utilities
export function getFullUrl(endpoint: string): string {
  let baseUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
  return `${baseUrl}${endpoint}`;
}

export async function initializeDynamosoft() {
  try {
    const { CoreModule } = await import('dynamsoft-capture-vision-bundle');
    
    CoreModule.engineResourcePaths = {
      dcvBundle: getFullUrl('assets/dynamsoft-capture-vision-bundle/'),
      dcvData: getFullUrl('assets/dynamsoft-capture-vision-data/'),
    };

    return CoreModule;
  } catch (error) {
    console.error('Failed to initialize Dynamosoft:', error);
    throw error;
  }
}

export function handleMrzParseResult(result: any): Record<string, any> {
  const parseResultInfo: Record<string, any> = {};

  try {
    const type = result.getFieldValue('documentCode');
    parseResultInfo['Document Type'] = JSON.parse(result.jsonString).CodeType;

    const nation = result.getFieldValue('issuingState');
    parseResultInfo['Issuing State'] = nation;

    const surName = result.getFieldValue('primaryIdentifier');
    parseResultInfo['Surname'] = surName;

    const givenName = result.getFieldValue('secondaryIdentifier');
    parseResultInfo['Given Name'] = givenName;

    const passportNumber =
      type === 'P'
        ? result.getFieldValue('passportNumber')
        : result.getFieldValue('documentNumber');
    parseResultInfo['Passport Number'] = passportNumber;

    const nationality = result.getFieldValue('nationality');
    parseResultInfo['Nationality'] = nationality;

    const gender = result.getFieldValue('sex');
    parseResultInfo['Gender'] = gender;

    const birthYear = result.getFieldValue('birthYear');
    const birthMonth = result.getFieldValue('birthMonth');
    const birthDay = result.getFieldValue('birthDay');

    let fullBirthYear = birthYear;
    if (parseInt(birthYear) > new Date().getFullYear() % 100) {
      fullBirthYear = '19' + birthYear;
    } else {
      fullBirthYear = '20' + birthYear;
    }
    parseResultInfo['Date of Birth (YYYY-MM-DD)'] = `${fullBirthYear}-${birthMonth}-${birthDay}`;

    const expiryYear = result.getFieldValue('expiryYear');
    const expiryMonth = result.getFieldValue('expiryMonth');
    const expiryDay = result.getFieldValue('expiryDay');

    let fullExpiryYear = expiryYear;
    if (parseInt(expiryYear) >= 60) {
      fullExpiryYear = '19' + expiryYear;
    } else {
      fullExpiryYear = '20' + expiryYear;
    }
    parseResultInfo['Date of Expiry (YYYY-MM-DD)'] = `${fullExpiryYear}-${expiryMonth}-${expiryDay}`;

    return parseResultInfo;
  } catch (error) {
    console.error('Error parsing MRZ result:', error);
    return parseResultInfo;
  }
}
