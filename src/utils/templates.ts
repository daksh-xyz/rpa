import { type Workflow } from '../types/workflow';

/**
 * Predefined workflow templates that can be imported directly into the app
 */

export const workflowTemplates: Workflow[] = [
  {
    id: 'template-admin-staff-creation',
    name: 'Create Admin Staff - SNC Novocuris',
    description: 'Automates the process of logging into SNC Novocuris and creating a new admin staff member',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    steps: [
      {
        id: 'step-1',
        type: 'navigate',
        title: 'Navigate to Login Page',
        description: 'Go to SNC Novocuris login page',
        config: {
          url: 'https://snc.novocuris.org'
        },
        order: 1
      },
      {
        id: 'step-2',
        type: 'type',
        title: 'Enter Email',
        description: 'Type email address in login form',
        config: {
          xpath: '/html/body/div/div/div[2]/div[2]/div/div[2]/div/form/div[1]/div/input',
          text: 'kerem@novocuris.com'
        },
        order: 2
      },
      {
        id: 'step-3',
        type: 'type',
        title: 'Enter Password',
        description: 'Type password in login form',
        config: {
          xpath: '/html/body/div/div/div[2]/div[2]/div/div[2]/div/form/div[2]/div/input',
          text: 'Admin123!SNC'
        },
        order: 3
      },
      {
        id: 'step-4',
        type: 'click',
        title: 'Click Login Button',
        description: 'Submit the login form',
        config: {
          xpath: '/html/body/div/div/div[2]/div[2]/div/div[2]/div/form/div[5]/button'
        },
        order: 4
      },
      {
        id: 'step-5',
        type: 'navigate',
        title: 'Navigate to Create Admin Staff',
        description: 'Go to the admin staff creation page',
        config: {
          url: 'https://snc.novocuris.org/home/admin-staff/create'
        },
        order: 5
      },
      {
        id: 'step-6',
        type: 'type',
        title: 'Enter Staff Email',
        description: 'Type email for new admin staff',
        config: {
          xpath: "//input[@name='email']",
          text: 'test@gmail.com'
        },
        order: 6
      },
      {
        id: 'step-7',
        type: 'type',
        title: 'Enter Phone Number',
        description: 'Type phone number for new admin staff',
        config: {
          xpath: "//*[@id='root']/div/div[2]/div[2]/main/div/form/div[1]/div/div[2]/div/div[2]/div/div/input",
          text: '9087777678'
        },
        order: 7
      },
      {
        id: 'step-8',
        type: 'type',
        title: 'Enter First Name',
        description: 'Type first name for new admin staff',
        config: {
          xpath: "//*[@id='root']/div/div[2]/div[2]/main/div/form/div[1]/div/div[2]/div/div[3]/div/div/input",
          text: 'Saideep'
        },
        order: 8
      },
      {
        id: 'step-9',
        type: 'type',
        title: 'Enter Last Name',
        description: 'Type last name for new admin staff',
        config: {
          xpath: "//*[@id='root']/div/div[2]/div[2]/main/div/form/div[1]/div/div[2]/div/div[4]/div/div/input",
          text: 'Gogineni'
        },
        order: 9
      },
      {
        id: 'step-10',
        type: 'click',
        title: 'Open Branch Dropdown',
        description: 'Click on the branch select dropdown',
        config: {
          xpath: "//*[@id='root']/div/div[2]/div[2]/main/div/form/div[1]/div/div[2]/div/div[5]/div/div/div/div"
        },
        order: 10
      },
      {
        id: 'step-11',
        type: 'click',
        title: 'Select SNC Branch',
        description: 'Select SNC from branch options',
        config: {
          xpath: "//div[contains(@class, 'css-1nmdiq5-menu')]//div[text()='SNC']"
        },
        order: 11
      },
      {
        id: 'step-12',
        type: 'click',
        title: 'Open Role Dropdown',
        description: 'Click on the role select dropdown',
        config: {
          xpath: "//*[@id='root']/div/div[2]/div[2]/main/div/form/div[1]/div/div[2]/div/div[6]/div/div/div/div"
        },
        order: 12
      },
      {
        id: 'step-13',
        type: 'click',
        title: 'Select Super Admin Role',
        description: 'Select Super admin from role options',
        config: {
          xpath: "//div[contains(@class, '-menu')]//div[text()='Super admin']"
        },
        order: 13
      },
      {
        id: 'step-14',
        type: 'click',
        title: 'Click Add Admin Staff Button',
        description: 'Click on the add admin staff button',
        config: {
          xpath: "//*[@id='root']/div/div[2]/div[2]/main/div/form/div[2]/button[2]"
        },
        order: 14
      }
    ]
  },
  {
    id: "template-patient-creation",
    name: "Create Patient Staff - SNC Novocuris",
    description: "Automates logging into SNC Novocuris and creating a new patient entry through the staff portal.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    steps: [
      {
        id: "step-1",
        type: "navigate",
        title: "Navigate to Login Page",
        description: "Opens the SNC Novocuris login page.",
        config: { url: "https://snc.novocuris.org" },
        order: 1
      },
      {
        id: "step-2",
        type: "wait",
        title: "Wait for Page to Load",
        description: "Waits for 5 seconds to ensure the login page elements are fully loaded.",
        config: { duration: 5 },
        order: 2
      },
      {
        id: "step-3",
        type: "type",
        title: "Enter Email",
        description: "Types the staff email address into the login email input field.",
        config: {
          xpath: "//input[@type='email' and @name='email']",
          text: "kerem@novocuris.com"
        },
        order: 3
      },
      {
        id: "step-4",
        type: "type",
        title: "Enter Password",
        description: "Enters the staff password into the password field.",
        config: {
          xpath: "//input[@type='password']",
          text: "Admin123!SNC"
        },
        order: 4
      },
      {
        id: "step-5",
        type: "click",
        title: "Click Login Button",
        description: "Submits the login form by clicking the login button.",
        config: {
          xpath: "//button[@type='submit']"
        },
        order: 5
      },
      {
        id: "step-6",
        type: "navigate",
        title: "Navigate to Create Patient Page",
        description: "Redirects to the 'Create New Patient' form page after successful login.",
        config: { url: "https://snc.novocuris.org/home/patients/create" },
        order: 6
      },
      {
        id: "step-7",
        type: "type",
        title: "Enter First Name",
        description: "Fills in the patient's first name.",
        config: {
          xpath: "//form//input[@name='firstName']",
          text: "Saideep"
        },
        order: 7
      },
      {
        id: "step-8",
        type: "type",
        title: "Enter Last Name",
        description: "Fills in the patient's last name.",
        config: {
          xpath: "//form//input[@name='lastName']",
          text: "Gogineni"
        },
        order: 8
      },
      {
        id: "step-9",
        type: "type",
        title: "Enter Phone Number",
        description: "Inputs the patient's phone number in the phone field.",
        config: {
          xpath: "//form//input[@type='tel' and contains(@placeholder, '123')]",
          text: "9887777890"
        },
        order: 9
      },
      {
        id: "step-10",
        type: "click",
        title: "Open Date Picker",
        description: "Opens the React DatePicker by clicking on the birthDate input field.",
        config: {
          xpath: "//form//input[@name='birthDate']"
        },
        order: 10
      },
      {
        id: "step-11",
        type: "click",
        title: "Select Year 2000",
        description: "Opens the year dropdown and selects 2000.",
        config: {
          xpath: "//select[contains(@class,'react-datepicker__year-select')]/option[@value='2000']"
        },
        order: 11
      },
      {
        id: "step-12",
        type: "click",
        title: "Select Month October",
        description: "Opens the month dropdown and selects October.",
        config: {
          xpath: "//select[contains(@class,'react-datepicker__month-select')]/option[@value='9']"
        },
        order: 12
      },
      {
        id: "step-13",
        type: "click",
        title: "Select Day 10",
        description: "Clicks on the 10th day in the visible calendar grid to confirm the DOB.",
        config: {
          xpath: "//div[contains(@class,'react-datepicker__day') and text()='10' and not(contains(@class,'outside-month'))]"
        },
        order: 13
      },
      {
        id: "step-14",
        type: "click",
        title: "Select Gender Male",
        description: "Selects 'Male' as the gender option.",
        config: {
          xpath: "//form//input[@name='gender' and @value='male']"
        },
        order: 14
      },
      {
        id: "step-15",
        type: "click",
        title: "Select Existing Patient - No",
        description: "Chooses 'No' for the 'Is an existing patient?' question.",
        config: {
          xpath: "//form//input[@name='isExistingPatient' and @value='no']"
        },
        order: 15
      },
      {
        id: "step-16",
        type: "click",
        title: "Open Country Dropdown",
        description: "Opens the country selection dropdown.",
        config: {
          xpath: "//form//div[input[@name='country']]//div[contains(@class,'control')]"
        },
        order: 16
      },
      {
        id: "step-17",
        type: "click",
        title: "Select Country - India",
        description: "Selects 'India' as the country from the dropdown menu.",
        config: {
          xpath: "//div[contains(@class,'menu')]//div[text()='India']"
        },
        order: 17
      },
      {
        id: "step-18",
        type: "type",
        title: "Enter Email Address",
        description: "Inputs the patient's email address.",
        config: {
          xpath: "//form//input[@type='email' and @name='email']",
          text: "testpatient@gmail.com"
        },
        order: 18
      },
      {
        id: "step-19",
        type: "type",
        title: "Enter Address Line 1",
        description: "Fills in the first line of the patient's address.",
        config: {
          xpath: "//form//input[@name='addressLineOne']",
          text: "123 Green Street"
        },
        order: 19
      },
      {
        id: "step-20",
        type: "type",
        title: "Enter City",
        description: "Inputs the patient's city name.",
        config: {
          xpath: "//form//input[@name='city']",
          text: "Hyderabad"
        },
        order: 20
      },
      {
        id: "step-21",
        type: "type",
        title: "Enter State",
        description: "Fills in the patient's state name.",
        config: {
          xpath: "//form//input[@name='state']",
          text: "Telangana"
        },
        order: 21
      },
      {
        id: "step-22",
        type: "type",
        title: "Enter Zip Code",
        description: "Inputs the postal or zip code for the address.",
        config: {
          xpath: "//form//input[@name='zipCode']",
          text: "500081"
        },
        order: 22
      },
      {
        id: "step-23",
        type: "click",
        title: "Open Nationality Dropdown",
        description: "Opens the nationality selection dropdown.",
        config: {
          xpath: "//form//div[input[@name='nationality']]//div[contains(@class,'control')]"
        },
        order: 23
      },
      {
        id: "step-24",
        type: "click",
        title: "Select Nationality - Indian",
        description: "Selects 'Indian' as the nationality from the dropdown.",
        config: {
          xpath: "//div[contains(@class,'menu')]//div[text()='Indian']"
        },
        order: 24
      },
      {
        id: "step-25",
        type: "click",
        title: "Open Blood Group Dropdown",
        description: "Opens the blood group selection dropdown.",
        config: {
          xpath: "//form//div[input[@name='bloodGroup']]//div[contains(@class,'control')]"
        },
        order: 25
      },
      {
        id: "step-26",
        type: "click",
        title: "Select Blood Group - O+",
        description: "Selects 'O+' as the blood group from the dropdown.",
        config: {
          xpath: "//div[contains(@class,'menu')]//div[text()='O+']"
        },
        order: 26
      },
      {
        id: "step-27",
        type: "type",
        title: "Enter Emergency Contact Name",
        description: "Fills in the emergency contact person's full name.",
        config: {
          xpath: "//form//input[@name='emergencyContactName']",
          text: "Ramesh Gogineni"
        },
        order: 27
      },
      {
        id: "step-28",
        type: "type",
        title: "Enter Emergency Contact Number",
        description: "Inputs the phone number of the emergency contact.",
        config: {
          xpath: "(//form//input[@type='tel'])[2]",
          text: "9876543210"
        },
        order: 28
      },
      {
        id: "step-29",
        type: "type",
        title: "Enter Profession",
        description: "Fills in the patient's occupation or profession.",
        config: {
          xpath: "//form//input[@name='profession']",
          text: "Software Engineer"
        },
        order: 29
      },
      {
        id: "step-30",
        type: "type",
        title: "Enter Employer Name",
        description: "Fills in the name of the patient's employer.",
        config: {
          xpath: "//form//input[@name='employerName']",
          text: "Novocuris Healthcare"
        },
        order: 30
      },
      {
        id: "step-31",
        type: "type",
        title: "Enter Marital Status",
        description: "Fills in the patient's marital status.",
        config: {
          xpath: "//form//input[@name='maritialStatus']",
          text: "Single"
        },
        order: 31
      },
      {
        id: "step-32",
        type: "click",
        title: "Submit Form - Add Patient",
        description: "Submits the completed patient creation form.",
        config: {
          xpath: "//form//button[@type='submit' or contains(., 'Add patient')]"
        },
        order: 32
      }
    ]
  }

];

/**
 * Helper function to import a template into the workflow system
 * This generates a new workflow with unique IDs based on the template
 */
export function createWorkflowFromTemplate(template: Workflow): Workflow {
  const timestamp = Date.now();
  return {
    ...template,
    id: `workflow-${timestamp}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    steps: template.steps.map((step, index) => ({
      ...step,
      id: `step-${timestamp}-${index}`,
      order: index + 1
    }))
  };
}