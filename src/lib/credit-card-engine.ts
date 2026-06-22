export function calculateInstallments(
  totalAmount: number,
  myAmount: number,
  purchaseDateStr: string,
  installments: number,
  closingDay: number,
  dueDay: number
) {
  const dates = [];
  
  // Divide os valores e formata com precisão de 2 casas
  const amountPerInstallment = Number((totalAmount / installments).toFixed(2));
  const myAmountPerInstallment = Number((myAmount / installments).toFixed(2));

  // A última parcela absorve possíveis dízimas e diferenças de centavos
  const amountLastInstallment = Number((totalAmount - (amountPerInstallment * (installments - 1))).toFixed(2));
  const myAmountLastInstallment = Number((myAmount - (myAmountPerInstallment * (installments - 1))).toFixed(2));

  // Usa meio-dia para forçar a data correta e evitar pulos de fuso horário
  const purchaseDate = new Date(purchaseDateStr + 'T12:00:00'); 
  
  let billMonth = purchaseDate.getMonth();
  let billYear = purchaseDate.getFullYear();

  // A Mágica do Fechamento: Se o dia da compra for igual ou maior que o fechamento, joga pra próxima fatura
  if (purchaseDate.getDate() >= closingDay) {
    billMonth += 1;
    if (billMonth > 11) {
      billMonth = 0;
      billYear += 1;
    }
  }

  for (let i = 1; i <= installments; i++) {
    // Define a data exata de vencimento desta parcela
    const dueDate = new Date(billYear, billMonth, dueDay, 12, 0, 0);
    
    dates.push({
      installment_current: i,
      installment_total: installments,
      amount: i === installments ? amountLastInstallment : amountPerInstallment,
      my_amount: i === installments ? myAmountLastInstallment : myAmountPerInstallment,
      date: dueDate.toISOString().split('T')[0]
    });

    // Avança 1 mês para a próxima parcela
    billMonth += 1;
    if (billMonth > 11) {
      billMonth = 0;
      billYear += 1;
    }
  }

  return dates;
}
