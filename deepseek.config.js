module.exports = {
  model: 'deepseek-v3.1',
  modes: {
    thinking: {
      enabled: true,
      max_time: 30000,
      use_cases: ['complex_analysis', 'validation']
    },
    non_thinking: {
      enabled: true,
      use_cases: ['scraping', 'file_generation']
    }
  },
  features: {
    multilingual: true,
    json_mode: true,
    function_calling: true
  }
};
