import re

def normalize_phone(phone):
    """
    Cleans and standardizes a phone / mobile number:
    - Strips whitespace
    - Empty string, 'None', 'null', 'na', etc. are returned as None
    - Extracts digits
    - For standard 10-digit mobile numbers (e.g. India):
        - 10 digits -> '9876543210'
        - 11 digits starting with '0' -> '9876543210'
        - 12 digits starting with '91' -> '9876543210'
        - 13 digits starting with '091' -> '9876543210'
    - For other phone numbers, returns the extracted digits
    """
    if phone is None:
        return None
    phone_str = str(phone).strip()
    if not phone_str or phone_str.lower() in ['', 'none', 'null', 'na', 'n/a', 'nil', '-', '--', 'undefined']:
        return None
        
    digits = re.sub(r'\D', '', phone_str)
    if not digits:
        return None
        
    if len(digits) == 10:
        return digits
    elif len(digits) == 11 and digits.startswith('0'):
        return digits[1:]
    elif len(digits) == 12 and digits.startswith('91'):
        return digits[2:]
    elif len(digits) == 13 and digits.startswith('091'):
        return digits[3:]
        
    return digits
