export const submitContactForm = async (data) => {
    try {
        const response = await fetch('/api/submit-form', {
            method: 'POST',
            body: JSON.stringify({ type: 'contact', data }),
        });
        return await response.json();
    } catch (error) {
        console.error('Error submitting contact form:', error);
        throw error;
    }
};

export const submitEventRegistration = async (data) => {
    try {
        const response = await fetch('/api/submit-form', {
            method: 'POST',
            body: JSON.stringify({ type: 'registration', data }),
        });
        return await response.json();
    } catch (error) {
        console.error('Error submitting event registration:', error);
        throw error;
    }
};
export const submitListingRequest = async (data) => {
    try {
        const response = await fetch('/api/submit-form', {
            method: 'POST',
            body: JSON.stringify({ type: 'listing-request', data }),
        });
        return await response.json();
    } catch (error) {
        console.error('Error submitting listing request:', error);
        throw error;
    }
};
