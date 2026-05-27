const form = document.querySelector("#pedidoForm");
const message = document.querySelector("#mensagem");
const cpfInput = document.querySelector("#cpf");
const cepInput = document.querySelector("#cep");
const streetInput = document.querySelector("#rua");
const neighborhoodInput = document.querySelector("#bairro");
const cepStatus = document.querySelector("#cepStatus");
const phoneInput = document.querySelector("#telefone");
const submitButton = form.querySelector(".submit-button");
const paymentModal = document.querySelector("#pagamentoPix");
const paymentSummary = document.querySelector("#pagamentoResumo");
const paymentStatus = document.querySelector("#pagamentoStatus");
const pixKeyInput = document.querySelector("#pixChave");
const copyPixButton = document.querySelector("#copiarPix");
const confirmPaymentButton = document.querySelector("#confirmarPagamento");
const editOrderButton = document.querySelector("#alterarPedido");
const successModal = document.querySelector("#sucessoPedido");
const successSummary = document.querySelector("#sucessoResumo");
const closeSuccessButton = document.querySelector("#fecharSucesso");
const images = document.querySelectorAll("img");
const orderEmail = "vinicios3007@gmail.com";
const orderEmailEndpoint = `https://formsubmit.co/ajax/${orderEmail}`;
const confirmPaymentButtonText = confirmPaymentButton.textContent;
const pixKey = "119806571119";
const flavorUnitPrice = 6;
const siteImageUrl = new URL("assets/docinhos-sortidos.jpg", window.location.href).href;
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
let cepRequestId = 0;
let pendingOrder = null;

const onlyDigits = (value) => value.replace(/\D/g, "");

const formatCurrency = (value) => currencyFormatter.format(value);

const preventNonDigitTyping = (event) => {
  if (event.inputType !== "insertText" || !event.data) {
    return;
  }

  if (!/^\d+$/.test(event.data)) {
    event.preventDefault();
  }
};

const formatCpf = (value) => {
  const digits = onlyDigits(value).slice(0, 11);

  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

const formatCep = (value) => {
  const digits = onlyDigits(value).slice(0, 8);

  return digits.replace(/(\d{5})(\d)/, "$1-$2");
};

const formatPhone = (value) => {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
};

const isValidCpf = (value) => {
  const digits = onlyDigits(value);

  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) {
    return false;
  }

  const calculateCheckDigit = (base) => {
    const total = base
      .split("")
      .reduce((sum, digit, index) => sum + Number(digit) * (base.length + 1 - index), 0);
    const remainder = (total * 10) % 11;

    return remainder === 10 ? 0 : remainder;
  };

  const firstDigit = calculateCheckDigit(digits.slice(0, 9));
  const secondDigit = calculateCheckDigit(digits.slice(0, 10));

  return firstDigit === Number(digits[9]) && secondDigit === Number(digits[10]);
};

const setMessage = (text, type) => {
  message.textContent = text;
  message.className = `form-message is-${type}`;
};

const clearMessage = () => {
  message.textContent = "";
  message.className = "form-message";
};

const setPaymentStatus = (text, type = "") => {
  paymentStatus.textContent = text;
  paymentStatus.className = type ? `payment-modal__status is-${type}` : "payment-modal__status";
};

const setPaymentSubmitState = (isSubmitting) => {
  confirmPaymentButton.disabled = isSubmitting;
  copyPixButton.disabled = isSubmitting;
  editOrderButton.disabled = isSubmitting;
  confirmPaymentButton.textContent = isSubmitting ? "Enviando aviso..." : confirmPaymentButtonText;
};

const setCepStatus = (text, type = "") => {
  cepStatus.textContent = text;
  cepStatus.className = type ? `field-help is-${type}` : "field-help";
};

const setFieldError = (field, hasError) => {
  field.setAttribute("aria-invalid", String(hasError));
};

const resetFieldErrors = () => {
  Array.from(form.elements).forEach((field) => {
    if (field.matches("input, select")) {
      setFieldError(field, false);
    }
  });
};

const clearAddress = () => {
  streetInput.value = "";
  neighborhoodInput.value = "";
};

const getOrderTotal = (quantity) => quantity * flavorUnitPrice;

const getFlavorPriceLabel = (flavor) => `${flavor} - ${formatCurrency(flavorUnitPrice)}`;

const buildSiteImageHtml = () => (
  `<img src="${siteImageUrl}" alt="Docinhos da Ari" width="600" style="max-width:100%;height:auto;border-radius:8px;">`
);

const showPaymentPopup = (order) => {
  pendingOrder = order;
  pixKeyInput.value = pixKey;
  paymentSummary.textContent = `${order.firstName}, pague ${formatCurrency(order.total)} no Pix para finalizar o pedido de ${order.quantity} ${order.itemLabel} de ${order.flavor}. Depois confirme abaixo para enviarmos o aviso por e-mail.`;
  setPaymentStatus("Copie a chave Pix e cole no aplicativo do seu banco.");
  paymentModal.hidden = false;
  document.body.classList.add("has-open-modal");
  copyPixButton.focus();
};

const hidePaymentPopup = () => {
  paymentModal.hidden = true;
  document.body.classList.remove("has-open-modal");
  setPaymentStatus("");
  pendingOrder = null;
  submitButton.focus();
};

const showSuccessPopup = ({ firstName, quantity, itemLabel, flavor, total }) => {
  successSummary.textContent = `${firstName}, recebemos seu pedido de ${quantity} ${itemLabel} de ${flavor}. Valor total: ${formatCurrency(total)}.`;
  successModal.hidden = false;
  document.body.classList.add("has-open-modal");
  closeSuccessButton.focus();
};

const hideSuccessPopup = () => {
  successModal.hidden = true;
  document.body.classList.remove("has-open-modal");
  form.querySelector("#nome").focus();
};

const fetchAddressByCep = async (cep) => {
  const currentRequestId = ++cepRequestId;

  setCepStatus("Buscando endereço...");

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);

    if (!response.ok) {
      throw new Error("CEP request failed");
    }

    const address = await response.json();

    if (currentRequestId !== cepRequestId) {
      return;
    }

    if (address.erro) {
      clearAddress();
      setFieldError(cepInput, true);
      setCepStatus("CEP não encontrado.", "error");
      return;
    }

    streetInput.value = address.logradouro || "";
    neighborhoodInput.value = address.bairro || "";
    setFieldError(cepInput, false);

    if (streetInput.value) {
      setFieldError(streetInput, false);
    }

    if (neighborhoodInput.value) {
      setFieldError(neighborhoodInput, false);
    }

    if (streetInput.value && neighborhoodInput.value) {
      setCepStatus("Endereço encontrado.", "success");
      return;
    }

    setCepStatus("Complete rua e bairro.");
  } catch (error) {
    if (currentRequestId !== cepRequestId) {
      return;
    }

    setCepStatus("Não foi possível buscar o CEP. Preencha rua e bairro.", "error");
  }
};

const validateForm = () => {
  const data = Object.fromEntries(new FormData(form));
  const requiredFields = Array.from(form.querySelectorAll("[required]"));
  let firstInvalidField = null;

  requiredFields.forEach((field) => {
    const isEmpty = field.value.trim() === "";
    setFieldError(field, isEmpty);

    if (isEmpty && !firstInvalidField) {
      firstInvalidField = field;
    }
  });

  const age = Number(data.idade);
  const quantity = Number(data.quantidade);
  const cpfIsInvalid = data.cpf && !isValidCpf(data.cpf);
  const cepIsInvalid = data.cep && onlyDigits(data.cep).length !== 8;
  const phoneIsInvalid = data.telefone && onlyDigits(data.telefone).length < 10;
  const ageIsInvalid = data.idade && (age < 1 || age > 120);
  const quantityIsInvalid = data.quantidade && quantity < 1;

  const validations = [
    [form.elements.cpf, cpfIsInvalid, "Informe um CPF válido."],
    [form.elements.cep, cepIsInvalid, "Informe um CEP válido."],
    [form.elements.telefone, phoneIsInvalid, "Informe um telefone válido."],
    [form.elements.idade, ageIsInvalid, "Informe uma idade válida."],
    [form.elements.quantidade, quantityIsInvalid, "Informe uma quantidade válida."],
  ];

  const failedValidation = validations.find(([, failed]) => failed);

  validations.forEach(([field, failed]) => {
    if (failed) {
      setFieldError(field, true);
    }
  });

  if (firstInvalidField) {
    firstInvalidField.focus();
    return "Preencha todos os campos obrigatórios.";
  }

  if (failedValidation) {
    const [field, , errorMessage] = failedValidation;
    field.focus();
    return errorMessage;
  }

  return "";
};

const buildOrderEmailPayload = (data) => {
  const quantity = Number(data.quantidade);
  const flavor = data.sabores.trim();
  const total = getOrderTotal(quantity);

  return {
    _subject: `Novo pedido com Pix para conferir - Docinhos da Ari - ${data.nome.trim()}`,
    _template: "table",
    _captcha: "false",
    "Idioma": "Português do Brasil",
    "Nome completo": data.nome.trim(),
    "Idade": data.idade,
    "CPF": data.cpf,
    "Telefone": data.telefone,
    "CEP": data.cep,
    "Rua": data.rua.trim(),
    "Bairro": data.bairro.trim(),
    "Número": data.numero.trim(),
    "Complemento": data.complemento.trim() || "Não informado",
    "Sabor": getFlavorPriceLabel(flavor),
    "Quantidade": data.quantidade,
    "Preço unitário": formatCurrency(flavorUnitPrice),
    "Valor total": formatCurrency(total),
    "Forma de pagamento": "Pix",
    "Chave Pix apresentada": pixKey,
    "Status do pagamento": "Cliente informou que realizou o Pix. Confira no banco antes de confirmar o pedido.",
    "Imagem do site": buildSiteImageHtml(),
    "Link da imagem do site": siteImageUrl,
  };
};

const sendOrderEmail = async (data) => {
  const response = await fetch(orderEmailEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(buildOrderEmailPayload(data)),
  });

  if (!response.ok) {
    throw new Error("Não foi possível enviar o pedido por e-mail.");
  }
};

cpfInput.addEventListener("beforeinput", preventNonDigitTyping);
cepInput.addEventListener("beforeinput", preventNonDigitTyping);

cpfInput.addEventListener("input", (event) => {
  event.target.value = formatCpf(event.target.value);
  setFieldError(event.target, false);
});

cepInput.addEventListener("input", (event) => {
  event.target.value = formatCep(event.target.value);
  setFieldError(event.target, false);

  const cep = onlyDigits(event.target.value);

  if (cep.length < 8) {
    cepRequestId += 1;
    clearAddress();
    setCepStatus("");
    return;
  }

  fetchAddressByCep(cep);
});

phoneInput.addEventListener("input", (event) => {
  event.target.value = formatPhone(event.target.value);
  setFieldError(event.target, false);
});

form.addEventListener("input", (event) => {
  if (event.target.matches("input, select")) {
    setFieldError(event.target, false);
    clearMessage();
  }
});

form.addEventListener("change", (event) => {
  if (event.target.matches("select")) {
    setFieldError(event.target, false);
    clearMessage();
  }
});

const hideBrokenImage = (image) => {
  image.classList.add("is-hidden");
};

images.forEach((image) => {
  image.addEventListener("error", () => hideBrokenImage(image));

  if (image.complete && image.naturalWidth === 0) {
    hideBrokenImage(image);
  }
});

const copyPixKey = async () => {
  const key = pixKeyInput.value;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(key);
    } else {
      pixKeyInput.focus();
      pixKeyInput.select();

      if (!document.execCommand("copy")) {
        throw new Error("Clipboard fallback failed");
      }
    }

    setPaymentStatus("Chave Pix copiada.", "success");
  } catch (error) {
    pixKeyInput.focus();
    pixKeyInput.select();
    setPaymentStatus("Não foi possível copiar automaticamente. Selecione a chave e copie.", "error");
  }
};

const confirmPayment = async () => {
  if (!pendingOrder) {
    return;
  }

  setPaymentSubmitState(true);
  setPaymentStatus("Enviando pedido e aviso de pagamento para conferência...");
  setMessage("Enviando pedido e aviso de pagamento por e-mail...", "info");

  try {
    await sendOrderEmail(pendingOrder.data);

    const completedOrder = pendingOrder;
    pendingOrder = null;
    paymentModal.hidden = true;

    setMessage(
      `Pedido enviado com sucesso, ${completedOrder.firstName}! ${completedOrder.quantity} ${completedOrder.itemLabel} de ${completedOrder.flavor}. Valor total: ${formatCurrency(completedOrder.total)}.`,
      "success",
    );

    form.reset();
    resetFieldErrors();
    setCepStatus("");
    showSuccessPopup(completedOrder);
  } catch (error) {
    setPaymentStatus(
      "Não foi possível enviar o e-mail de conferência. Verifique sua conexão e tente novamente.",
      "error",
    );
    setMessage(
      "Não foi possível enviar o pedido por e-mail. Verifique sua conexão e tente novamente.",
      "error",
    );
  } finally {
    setPaymentSubmitState(false);
  }
};

copyPixButton.addEventListener("click", copyPixKey);
confirmPaymentButton.addEventListener("click", confirmPayment);
editOrderButton.addEventListener("click", hidePaymentPopup);

paymentModal.addEventListener("click", (event) => {
  if (event.target === paymentModal) {
    hidePaymentPopup();
  }
});

closeSuccessButton.addEventListener("click", hideSuccessPopup);

successModal.addEventListener("click", (event) => {
  if (event.target === successModal) {
    hideSuccessPopup();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !paymentModal.hidden) {
    hidePaymentPopup();
    return;
  }

  if (event.key === "Escape" && !successModal.hidden) {
    hideSuccessPopup();
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (submitButton.disabled) {
    return;
  }

  const errorMessage = validateForm();

  if (errorMessage) {
    setMessage(errorMessage, "error");
    return;
  }

  const data = Object.fromEntries(new FormData(form));
  const firstName = data.nome.trim().split(/\s+/)[0];
  const quantity = Number(data.quantidade);
  const itemLabel = quantity === 1 ? "unidade" : "unidades";
  const flavor = data.sabores.trim();
  const total = getOrderTotal(quantity);

  clearMessage();
  showPaymentPopup({ data, firstName, quantity, itemLabel, flavor, total });
});
