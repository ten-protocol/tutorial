import { ethers } from 'ethers';
import { formatEther } from 'ethers/lib/utils';
import ERC20 from '../artifacts/contracts/Guess.sol/ERC20.json';
import Guess from '../artifacts/contracts/Guess.sol/Guess.json';
// The Hardhat configuration starts with just two accounts. Import these into your wallet.
// Developer private key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
// User private key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
// Contract address is hard-coded for now.
const ERC20_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const GUESS_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';

const addNetworkLink = document.getElementById('add-network-link') as HTMLLinkElement;
const guessButton = document.getElementById('guess-button') as HTMLButtonElement;
const approveButton = document.getElementById('approve-button') as HTMLButtonElement;
const guessInput = document.getElementById('guess-input') as HTMLInputElement;
const approveInput = document.getElementById('approve-input') as HTMLInputElement;
const guessRange = document.getElementById('guess-range') as HTMLSpanElement;
const connectedAddress = document.getElementById('connected-address') as HTMLSpanElement;
const chainId = document.getElementById('chain-id') as HTMLSpanElement;
const allowance = document.getElementById('allowance') as HTMLSpanElement;

const provider = new ethers.providers.Web3Provider(window.ethereum)
await provider.send('eth_requestAccounts', []);
const signer = provider.getSigner();
const erc20Contract = new ethers.Contract(ERC20_ADDRESS, ERC20.abi, signer);
const guessContract = new ethers.Contract(GUESS_ADDRESS, Guess.abi, signer);
const signerAddress = await signer.getAddress();
const filterApproval = erc20Contract.filters.Approval(signerAddress);
const filterCorrect = guessContract.filters.Correct(signerAddress);
const filterIncorrect = guessContract.filters.Incorrect(signerAddress);
const filterWarmer = guessContract.filters.Warmer(signerAddress);
const filterColder = guessContract.filters.Colder(signerAddress);

const symbol = await erc20Contract.symbol();
guessRange.innerText = await guessContract.guessRange();
connectedAddress.innerText = signerAddress.substring(0, 18) + '..';
provider.getSigner().getChainId().then(result => {chainId.innerText = result.toString()});
updateAllowance();

addNetworkLink?.addEventListener('click', _ => { addNetwork(); });
guessButton?.addEventListener('click', _ => { guess() });
approveButton?.addEventListener('click', _ => { approve() });

erc20Contract.on(filterApproval, (owner, _, value) => {
    updateAllowance();
    displayMessage(`Approval of ${ethers.utils.formatEther(value)} ${symbol} by account ${owner} to the game was successful.`);
});

guessContract.on(filterCorrect, (_, guess, prize) => {
    updateAllowance();
    displayMessage(`Congratulations! Your guess of ${guess} has won you the prize of ${ethers.utils.formatEther(prize)} ${symbol}.`);
});

guessContract.on(filterIncorrect, (_, guess, prize) => {
    updateAllowance();
    displayMessage(`Sorry! Your guess of ${guess} was wrong. If you try again, we'll tell you whether you're getting warmer. The prize pool of ${ethers.utils.formatEther(prize)} ${symbol} is stil up for grabs.`);
});

guessContract.on(filterWarmer, (_, guess, prize) => {
    updateAllowance();
    displayMessage(`Looking good! Your guess of ${guess} was closer that your previous try. The prize pool of ${ethers.utils.formatEther(prize)} ${symbol} is within reach!.`);
});

guessContract.on(filterColder, (_, guess, prize) => {
    updateAllowance();
    displayMessage(`Uh oh. Your guess of ${guess} was worse than your previous try. Take heart! The prize pool is now  ${ethers.utils.formatEther(prize)} ${symbol}.`);
});

function updateAllowance() {
    erc20Contract.allowance(signerAddress, GUESS_ADDRESS).then((result: bigint) => {
        guessButton.disabled = (result == BigInt(0));
        allowance.innerText = formatEther(result).split('.')[0];
    });
}

async function approve() {
    try {
        const approval = await erc20Contract.approve(
            GUESS_ADDRESS,
            ethers.utils.parseEther(approveInput.value),
            { gasLimit: 400000 }
        );
        approval.wait();
    } catch (error) {
        alert('Error while attempting to approve.' + JSON.stringify(error));
    }
}

async function guess() {
    try {
        const attempt = await guessContract.attempt(
            parseInt(guessInput.value),
            { gasLimit: 400000 }
        );
        attempt.wait();
    } catch (error) {
        alert('Error while attempting to guess.' + JSON.stringify(error));
    }
}

function displayMessage(msg: string) {
    const para = (<HTMLTemplateElement>document.getElementById('message')).content.querySelector('p');
    const message = document.importNode(para as HTMLParagraphElement, true);
    message.append(msg);
    document.querySelector('main')?.prepend(message);
}

function addNetwork(): void {
    (window as any).ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
            chainId: '0x309', // 777 in hex
            chainName: 'Obscuro Testnet',
            rpcUrls: ['http://127.0.0.1:3000'],
            nativeCurrency: {
                name: 'OBX',
                symbol: 'OBX',
                decimals: 18,
            },
            blockExplorerUrls: null,
        }],
    })
    .then((_: any) => {
        displayMessage('Obscuro Testnet network added.');
    })
    .catch((_: any) => {
        displayMessage('Failed to add Obscuro Testnet network. Please check the wallet extension is running.');
    });
}
