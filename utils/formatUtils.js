
export function convertToCSV(data){
    if (data.length === 0) return '';
    
    // Get headers
    const headers = Object.keys(data[0]);
    
    // Create CSV header row
    let csv = headers.join(',') + '\n';
    
    // Add data rows
    data.forEach(row => {
      const values = headers.map(header => {
        const val = row[header];
        // Handle strings with commas, quotes, etc.
        if (typeof val === 'string') {
          return `"${val.replace(/"/g, '""')}"`;
        }
        // Use empty string for null/undefined
        return val === null || val === undefined ? '' : val;
      });
      csv += values.join(',') + '\n';
    });
    
    return csv;
  }
  
export function formatErrorResponse(error){
    const message = error instanceof Error ? error.message : error;
    return {
      content: [{ 
        type: "text", 
        text: JSON.stringify({ error: message }, null, 2) 
      }],
      isError: true
    };
}
  
export function formatSuccessResponse(data){
    return {
      content: [{ 
        type: "text", 
        text: JSON.stringify(data, null, 2) 
      }],
      isError: false
    };
} 