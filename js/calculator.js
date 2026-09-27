/**
 * Arizona Mortgage & Investment Calculator Engine
 * MERIDIAN Private Brokerage — Scottsdale & Paradise Valley, AZ
 * Maricopa County property tax rate: 0.62%
 * Standard homeowner insurance rate: 0.25% per annum
 */

const Calculator = (() => {

  // Maricopa County assessed value ratio & tax rate
  const MARICOPA_TAX_RATE = 0.0062;       // 0.62% effective rate on market value
  const INSURANCE_RATE = 0.0025;          // 0.25% standard AZ homeowner insurance
  const JUMBO_THRESHOLD = 806500;         // 2026 FHFA jumbo loan conforming limit

  /**
   * Standard Amortization Formula:
   * M = P × [ r(1+r)^n ] / [ (1+r)^n – 1 ]
   * Where:
   *  P = Principal loan amount
   *  r = Monthly interest rate (annual / 12)
   *  n = Total number of payments (years × 12)
   */
  function calcMonthlyMortgage(principal, annualRate, termYears) {
    if (annualRate === 0) return principal / (termYears * 12);
    const r = annualRate / 100 / 12;
    const n = termYears * 12;
    return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }

  function calcMonthlyTax(homePrice) {
    return (homePrice * MARICOPA_TAX_RATE) / 12;
  }

  function calcMonthlyInsurance(homePrice) {
    return (homePrice * INSURANCE_RATE) / 12;
  }

  function isJumboLoan(loanAmount) {
    return loanAmount > JUMBO_THRESHOLD;
  }

  function getRecommendedRate(loanAmount) {
    // Approximate 2026 prevailing rates
    return isJumboLoan(loanAmount) ? 6.75 : 6.45;
  }

  function calculate({ homePrice, downPaymentPct, annualRate, termYears, hoaMonthly = 0 }) {
    const downPayment = homePrice * (downPaymentPct / 100);
    const loanAmount = homePrice - downPayment;
    const monthlyPI = calcMonthlyMortgage(loanAmount, annualRate, termYears);
    const monthlyTax = calcMonthlyTax(homePrice);
    const monthlyInsurance = calcMonthlyInsurance(homePrice);
    const totalMonthly = monthlyPI + monthlyTax + monthlyInsurance + hoaMonthly;
    const totalPaid = monthlyPI * termYears * 12;
    const totalInterest = totalPaid - loanAmount;
    const isJumbo = isJumboLoan(loanAmount);
    const ltvRatio = (loanAmount / homePrice) * 100;

    return {
      homePrice,
      downPayment,
      downPaymentPct,
      loanAmount,
      annualRate,
      termYears,
      isJumboLoan: isJumbo,
      ltvRatio: ltvRatio.toFixed(1),
      monthlyPI: monthlyPI.toFixed(2),
      monthlyTax: monthlyTax.toFixed(2),
      monthlyInsurance: monthlyInsurance.toFixed(2),
      monthlyHOA: hoaMonthly.toFixed(2),
      totalMonthly: totalMonthly.toFixed(2),
      totalInterest: totalInterest.toFixed(2),
      totalPaid: totalPaid.toFixed(2),
      totalCostOfOwnership: (totalPaid + downPayment).toFixed(2),
      piPercent: ((monthlyPI / totalMonthly) * 100).toFixed(1),
      taxPercent: ((monthlyTax / totalMonthly) * 100).toFixed(1),
      insurancePercent: ((monthlyInsurance / totalMonthly) * 100).toFixed(1),
      hoaPercent: ((hoaMonthly / totalMonthly) * 100).toFixed(1)
    };
  }

  function formatCurrency(value, compact = false) {
    const num = parseFloat(value);
    if (compact && num >= 1000000) return '$' + (num / 1000000).toFixed(2) + 'M';
    if (compact && num >= 1000) return '$' + (num / 1000).toFixed(0) + 'K';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  }

  function getPresetForProperty(price, hoaMonthly = 0) {
    return {
      homePrice: price,
      downPaymentPct: 20,
      annualRate: getRecommendedRate(price * 0.80),
      termYears: 30,
      hoaMonthly
    };
  }

  return { calculate, formatCurrency, getPresetForProperty, getRecommendedRate, isJumboLoan };
})();
