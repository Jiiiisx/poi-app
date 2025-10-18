document.addEventListener('DOMContentLoaded', function () {
    function initializeWizard(formId) {
        const form = document.getElementById(formId);
        if (!form) return;

        const steps = Array.from(form.querySelectorAll('.form-step'));
        const progressBarItems = Array.from(form.querySelectorAll('.progress-bar-item'));
        let currentStep = 0;

        function showStep(stepIndex, direction = 'forward') {
            const currentActiveStep = form.querySelector('.form-step.active');
            const nextStep = steps[stepIndex];

            if (currentActiveStep) {
                gsap.to(currentActiveStep, {
                    opacity: 0,
                    x: direction === 'forward' ? -50 : 50,
                    duration: 0.5,
                    onComplete: () => {
                        currentActiveStep.classList.remove('active');
                        nextStep.classList.add('active');
                        gsap.fromTo(nextStep, 
                            { opacity: 0, x: direction === 'forward' ? 50 : -50 }, 
                            { opacity: 1, x: 0, duration: 0.5 });

                        // Animate form elements
                        const elements = nextStep.querySelectorAll('.form-group, .section-title, .form-actions');
                        gsap.from(elements, { 
                            opacity: 0, 
                            y: 20, 
                            duration: 0.4, 
                            stagger: 0.1, 
                            ease: 'power2.out' 
                        });
                    }
                });
            } else {
                nextStep.classList.add('active');
                gsap.fromTo(nextStep, { opacity: 0, x: 0 }, { opacity: 1, x: 0, duration: 0.5 });
            }

            if (progressBarItems.length > 0) {
                progressBarItems.forEach((item, index) => {
                    item.classList.toggle('active', index <= stepIndex);
                });
            }

            currentStep = stepIndex;
        }

        function validateStep(stepIndex) {
            const currentStepFields = steps[stepIndex].querySelectorAll('[required]');
            let isValid = true;
            currentStepFields.forEach(field => {
                if (!field.checkValidity()) { // checkValidity() is more robust
                    isValid = false;
                    field.classList.add('is-invalid');
                } else {
                    field.classList.remove('is-invalid');
                }
            });
            return isValid;
        }

        form.addEventListener('click', function (e) {
            if (e.target.matches('[data-next]')) {
                if (validateStep(currentStep)) {
                    if (currentStep < steps.length - 1) {
                        showStep(currentStep + 1, 'forward');
                    }
                }
            } else if (e.target.matches('[data-previous]')) {
                if (currentStep > 0) {
                    showStep(currentStep - 1, 'backward');
                }
            }
        });

        // Function to reset wizard to the first step
        function resetWizard() {
            showStep(0);
        }

        // Attach the reset function to the form so it can be called from outside
        form.resetWizard = resetWizard;

        // Initialize the wizard
        const initialStep = 0;
        steps.forEach((step, index) => {
            if (index === initialStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
        gsap.fromTo(steps[initialStep], { opacity: 0 }, { opacity: 1, duration: 0.5 });
        if (progressBarItems.length > 0) {
            progressBarItems.forEach((item, index) => {
                item.classList.toggle('active', index <= initialStep);
            });
        }
        currentStep = initialStep;
    }

    initializeWizard('editForm');
    initializeWizard('gov-edit-form');
});