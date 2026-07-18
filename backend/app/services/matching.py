COMPATIBILITY_MAP = {
    "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    "AB-": ["A-", "B-", "AB-", "O-"],
    "A+": ["A+", "A-", "O+", "O-"],
    "A-": ["A-", "O-"],
    "B+": ["B+", "B-", "O+", "O-"],
    "B-": ["B-", "O-"],
    "O+": ["O+", "O-"],
    "O-": ["O-"],
}

DONATION_MAP = {
    "O-": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    "O+": ["A+", "B+", "AB+", "O+"],
    "A-": ["A+", "A-", "AB+", "AB-"],
    "A+": ["A+", "AB+"],
    "B-": ["B+", "B-", "AB+", "AB-"],
    "B+": ["B+", "AB+"],
    "AB-": ["AB+", "AB-"],
    "AB+": ["AB+"],
}

def get_compatible_donor_types(recipient_blood_group: str) -> list[str]:
    """Returns a list of blood types that can be given to the recipient."""
    return COMPATIBILITY_MAP.get(recipient_blood_group, [recipient_blood_group])

def get_compatible_recipient_types(donor_blood_group: str) -> list[str]:
    """Returns a list of blood types that a donor's blood can be given to."""
    return DONATION_MAP.get(donor_blood_group, [donor_blood_group])
