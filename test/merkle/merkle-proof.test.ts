import { assert } from 'chai';
import { describe, it } from 'mocha';

import * as crypto from 'crypto';

import Proof from '../../src/merkle/proof';
import { MergeFunction, Node } from '../../src/merkle/merkle';
import { MerkleTree } from '../../src/merkle/merkle-tree';

class StringConcat implements MergeFunction<string> {
  async merge(n1: Node<string>, n2: Node<string>): Promise<Node<string>> {
    return new Node(`Hash(${n1} + ${n2})`);
  }
}

// tslint:disable-next-line:max-classes-per-file
class HashConcat implements MergeFunction<Uint8Array> {
  async merge(n1: Node<Uint8Array>, n2: Node<Uint8Array>): Promise<Node<Uint8Array>> {
    if (!n1) {
      throw new Error('The concat function expects two hash arguments, the first was not received.');
    }
    if (!n2) {
      throw new Error('The concat function expects two hash arguments, the second was not received.');
    }
    return new Node(sha256(Buffer.concat([n1.data, n2.data])));
  }
}

// use the crypto module to create a sha256 hash from the node passed in
const sha256 = (data: any): Uint8Array => {
  return crypto.createHash('sha256').update(data).digest();
};

// given a proof, finds the merkle root
const hashProof = (value: any, proof: Proof<Uint8Array>[]): any => {
  let data: Uint8Array = sha256(value);
  for (let i = 0; i < proof.length; i++) {
    let buffers: Uint8Array[];
    if (proof[i].left) {
      buffers = new Array<Uint8Array>(proof[i].node.data, data);
    } else {
      buffers = new Array<Uint8Array>(data, proof[i].node.data);
    }
    data = sha256(Buffer.concat(buffers));
  }
  return data;
};

const concatHash = async (a: Node<Uint8Array>, b: Node<Uint8Array>): Promise<Node<Uint8Array>> => {
  if (!a) {
    throw new Error('The concat function expects two hash arguments, the first was not received.');
  }
  if (!b) {
    throw new Error('The concat function expects two hash arguments, the second was not received.');
  }
  return new Node(sha256(Buffer.concat([a.data, b.data])));
};

const concatLetters = async (a: Node<string>, b: Node<string>): Promise<Node<string>> => new Node(`Hash(${a} + ${b})`);

describe('Merkle tree proofs tests', () => {
  const leaves = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const root = 'eb100814abc896ab18bcf6c37b6550eeadeae0c312532286a4cf4be132ace526';
  const hashTree = new MerkleTree<Uint8Array>(new HashConcat());
  hashTree.build(leaves.map(sha256));

  const lettersTree = new MerkleTree<string>(new StringConcat());
  lettersTree.build(leaves);

  describe('for each leaf', async () => {
    leaves.forEach((leaf, i) => {
      it(`should return a proof that calculates the root from leaf ${leaves[i]}`, async () => {
        const proof = hashTree.getProof(i);
        const hashedProof = hashProof(leaf, proof).toString('hex');
        if (hashedProof !== root) {
          const lettersProof = lettersTree.getProof(i);
          // tslint:disable-next-line:no-console
          console.log(
            'The resulting hash of your proof is wrong. \n' +
              `We were expecting: ${root} \n` +
              `We received: ${hashedProof} \n` +
              `In ${leaves.join('')} Merkle tree, the proof of ${leaves[i]} you gave us is: \n` +
              `${JSON.stringify(lettersProof, null, 2)}`,
          );
        }
        assert.equal(hashedProof, root);
      });
    });
  });
});
