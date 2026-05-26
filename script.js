const form = document.querySelector("#pedidoForm");
const message = document.querySelector("#mensagem");
const cpfInput = document.querySelector("#cpf");
const cepInput = document.querySelector("#cep");
const streetInput = document.querySelector("#rua");
const neighborhoodInput = document.querySelector("#bairro");
const cepStatus = document.querySelector("#cepStatus");
const phoneInput = document.querySelector("#telefone");
const submitButton = form.querySelector(".submit-button");
const images = document.querySelectorAll("img");
const orderEmail = "vinicios3007@gmail.com";
const orderEmailEndpoint = `https://formsubmit.co/ajax/${orderEmail}`;
const submitButtonText = submitButton.textContent;
let cepRequestId = 0;

const onlyDigits = (value) => value.replace(/\D/g, "");

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

const setSubmitState = (isSubmitting) => {
  submitButton.disabled = isSubmitting;
  submitButton.textContent = isSubmitting ? "Enviando pedido..." : submitButtonText;
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

const fetchAddressByCep = async (cep) => {
  const currentRequestId = ++cepRequestId;

  setCepStatus("Buscando endereco...");

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
      setCepStatus("CEP nao encontrado.", "error");
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
      setCepStatus("Endereco encontrado.", "success");
      return;
    }

    setCepStatus("Complete rua e bairro.");
  } catch (error) {
    if (currentRequestId !== cepRequestId) {
      return;
    }

    setCepStatus("Nao foi possivel buscar o CEP. Preencha rua e bairro.", "error");
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
    [form.elements.cpf, cpfIsInvalid, "Informe um CPF valido."],
    [form.elements.cep, cepIsInvalid, "Informe um CEP valido."],
    [form.elements.telefone, phoneIsInvalid, "Informe um telefone valido."],
    [form.elements.idade, ageIsInvalid, "Informe uma idade valida."],
    [form.elements.quantidade, quantityIsInvalid, "Informe uma quantidade valida."],
  ];

  const failedValidation = validations.find(([, failed]) => failed);

  validations.forEach(([field, failed]) => {
    if (failed) {
      setFieldError(field, true);
    }
  });

  if (firstInvalidField) {
    firstInvalidField.focus();
    return "Preencha todos os campos obrigatorios.";
  }

  if (failedValidation) {
    const [field, , errorMessage] = failedValidation;
    field.focus();
    return errorMessage;
  }

  return "";
};

const buildOrderEmailPayload = (data) => ({
  _subject: `Novo pedido - Docinhos da Ari - ${data.nome.trim()}`,
  _template: "table",
  _captcha: "false",
  Nome: data.nome.trim(),
  Idade: data.idade,
  CPF: data.cpf,
  Telefone: data.telefone,
  CEP: data.cep,
  Rua: data.rua.trim(),
  Bairro: data.bairro.trim(),
  Numero: data.numero.trim(),
  Complemento: data.complemento.trim() || "Nao informado",
  Sabor: data.sabores.trim(),
  Quantidade: data.quantidade,
});

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
    throw new Error("Nao foi possivel enviar o pedido por email.");
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

form.addEventListener("submit", async (event) => {
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

  setSubmitState(true);
  setMessage("Enviando pedido por email...", "info");

  try {
    await sendOrderEmail(data);

    setMessage(
      `Pedido enviado com sucesso, ${firstName}! ${quantity} ${itemLabel} de ${data.sabores.trim()}.`,
      "success",
    );

    form.reset();
    resetFieldErrors();
    setCepStatus("");
    form.querySelector("#nome").focus();
  } catch (error) {
    setMessage(
      "Nao foi possivel enviar o pedido por email. Verifique sua conexao e tente novamente.",
      "error",
    );
  } finally {
    setSubmitState(false);
  }
});
