const form = document.querySelector("#pedidoForm");
const message = document.querySelector("#mensagem");
const cpfInput = document.querySelector("#cpf");
const phoneInput = document.querySelector("#telefone");
const images = document.querySelectorAll("img");

const onlyDigits = (value) => value.replace(/\D/g, "");

const formatCpf = (value) => {
  const digits = onlyDigits(value).slice(0, 11);

  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
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

const setFieldError = (field, hasError) => {
  field.setAttribute("aria-invalid", String(hasError));
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
  const phoneIsInvalid = data.telefone && onlyDigits(data.telefone).length < 10;
  const ageIsInvalid = data.idade && (age < 1 || age > 120);
  const quantityIsInvalid = data.quantidade && quantity < 1;

  const validations = [
    [form.elements.cpf, cpfIsInvalid, "Informe um CPF valido."],
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

cpfInput.addEventListener("input", (event) => {
  event.target.value = formatCpf(event.target.value);
  setFieldError(event.target, false);
});

phoneInput.addEventListener("input", (event) => {
  event.target.value = formatPhone(event.target.value);
  setFieldError(event.target, false);
});

form.addEventListener("input", (event) => {
  if (event.target.matches("input")) {
    setFieldError(event.target, false);
    message.textContent = "";
    message.className = "form-message";
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

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const errorMessage = validateForm();

  if (errorMessage) {
    setMessage(errorMessage, "error");
    return;
  }

  const data = Object.fromEntries(new FormData(form));
  const firstName = data.nome.trim().split(/\s+/)[0];
  const quantity = Number(data.quantidade);
  const itemLabel = quantity === 1 ? "unidade" : "unidades";

  setMessage(
    `Pedido registrado com sucesso, ${firstName}! ${quantity} ${itemLabel} de ${data.sabores.trim()}.`,
    "success",
  );

  form.reset();
  form.querySelector("#nome").focus();
});
