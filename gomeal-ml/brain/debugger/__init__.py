from core.input.preprocess import PreprocessedVectorEmbedding
from core.core.neuron import Neuron
from core.core.synapse import Synapse
from core.core.macro_neuron import MacroNeuron
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from typing import Optional, List

class Debugger:

    @staticmethod
    def vector(v: PreprocessedVectorEmbedding):
        print("---- VECTOR DEBUG ----")
        print(f"id:     {v.id}")
        print(f"dims:   {v.dim}")
        print(f"vector: {', '.join(f'{x:.6f}' for x in v.vector[:5])}...\n")


    @staticmethod
    def synapse(s: Synapse, brain=None, indent: int = 0, source_activation: Optional[float] = None):
        prefix = '\t' * indent
        print(f"{prefix}---- SYNAPSE DEBUG ----")
        print(f"{prefix}id:                  {getattr(s, 'id', None)}")
        print(f"{prefix}source_id:           {s.source_id}")
        print(f"{prefix}source_type:         {getattr(s, 'source_type', None)}")
        print(f"{prefix}target_id:           {s.target_id}")
        print(f"{prefix}target_type:         {getattr(s, 'target_type', None)}")
        print(f"{prefix}strength:            {s.strength:.6f}")
        print(f"{prefix}learning_rate:       {getattr(s, 'learning_rate', None)}")
        print(f"{prefix}abstraction_gap:     {getattr(s, 'abstraction_level_gap', None)}")
        print(f"{prefix}abstraction_decay:   {getattr(s, 'abstraction_decay', None)}")

        if hasattr(s, "last_updated"):
            print(f"{prefix}last_updated:        {s.last_updated}")

        if source_activation is not None and hasattr(s, "propagate"):
            try:
                propagated = s.propagate(source_activation)
                print(f"{prefix}propagate({source_activation:.6f}): {propagated:.6f}")
            except Exception as e:
                print(f"{prefix}propagate_error:     {e}")

        if brain is not None:
            try:
                src_node = brain.get_neuron(int(s.source_id))
            except Exception:
                src_node = None

            try:
                tgt_node = brain.get_neuron(int(s.target_id))
            except Exception:
                tgt_node = None

            if src_node is not None:
                print(f"{prefix}source_model:        {getattr(src_node, 'source_model', None)}")
                print(f"{prefix}source_source_id:    {getattr(src_node, 'source_id', None)}")
                print(f"{prefix}source_activation:   {getattr(src_node, 'activation', None)}")

            if tgt_node is not None:
                print(f"{prefix}target_model:        {getattr(tgt_node, 'source_model', None)}")
                print(f"{prefix}target_source_id:    {getattr(tgt_node, 'source_id', None)}")
                print(f"{prefix}target_activation:   {getattr(tgt_node, 'activation', None)}")

        print()

    @staticmethod
    def neuron(n: Neuron, showSynapses: bool = True, indent: int = 0):
        prefix ='\t' * indent
        print(f"{prefix}---- NEURON DEBUG ----")
        print(f"{prefix}neuron_id:  {n.neuron_id}")
        print(f"{prefix}type:       {n.neuron_type}")
        print(f"{prefix}source_id:  {n.source_id}")
        print(f"{prefix}dims:       {len(n.vector)}")
        print(f"{prefix}strength:   {n.strength}")
        print(f"{prefix}activation: {n.activation}")
        print(f"{prefix}connections:{len(n.connections)}")
        print(f"{prefix}vector:     {', '.join(f'{x:.6f}' for x in n.vector[:5])}...")
        if showSynapses and n.brain:
            print(f"{prefix}in_synapses:  {[n.brain.synapses[sys_id].source_id for sys_id in n.in_synapses]}")
            print(f"{prefix}out_synapses: {[n.brain.synapses[sys_id].target_id for sys_id in n.out_synapses]} \n")
            

    @staticmethod
    def macro_neuron(m: MacroNeuron, showSynapses: bool = True, indent: int = 0):
        prefix = '\t' * indent
        print(f"{prefix}---- MACRO NEURON DEBUG ----")
        print(f"{prefix}macro_neuron_id: {m.macro_neuron_id}")
        print(f"{prefix}child_neuron_ids: {m.child_neuron_ids}")
        print(f"{prefix}dims: {len(m.vector)}")
        print(f"{prefix}strength: {m.strength}")
        print(f"{prefix}activation: {m.activation}")
        print(f"{prefix}connections: {len(m.connections)}")
        print(f"{prefix}vector: {', '.join(f'{x:.6f}' for x in m.vector[:5])}...")
        if showSynapses and m.brain:
            print(f"{prefix}in_synapses:  {[m.brain.synapses[sys_id].source_id for sys_id in m.in_synapses]}")
            print(f"{prefix}out_synapses: {[m.brain.synapses[sys_id].target_id for sys_id in m.out_synapses]}\n")
        if m.brain:
            print(f"{prefix}---- MACRO NEURON DEBUG ----")
            for child_id in m.child_neuron_ids:
                child_neuron = m.brain.neurons.get(int(child_id))
                if child_neuron:
                    Debugger.neuron(child_neuron, indent=indent + 1)


    @staticmethod
    def cluster_similarity(m: MacroNeuron):
        if not m.brain:
            print("MacroNeuron has no brain reference.")
            return

        child_vectors = []
        child_ids = []

        for child_id in m.child_neuron_ids:
            child = m.brain.neurons.get(int(child_id))
            if child:
                child_vectors.append(child.vector)
                child_ids.append(child_id)

        if len(child_vectors) < 2:
            print(f"MacroNeuron {m.macro_neuron_id} has less than 2 child neurons.")
            return

        child_vectors = np.array(child_vectors)
        similarity_matrix = cosine_similarity(child_vectors)

        print(f"---- SIMILARITY DEBUG {m.macro_neuron_id} ----")
        print(f"Child neuron IDs: {child_ids}")
        print(np.round(similarity_matrix, 3))

        upper_tri = similarity_matrix[np.triu_indices_from(similarity_matrix, k=1)]
        avg_similarity = np.mean(upper_tri)

        print(f"Average similarity: {avg_similarity:.4f}\n")

    
    @staticmethod
    def scope_similarity(m: MacroNeuron):

        Debugger.cluster_similarity(m)
        
        scopes = m.summary.scopes

        print(f"---- SCOPE DEBUG {m.macro_neuron_id} ----")
        print(f"intent:    {scopes.intent}")
        print(f"lifestyle: {scopes.lifestyle}")
        print()

        if not m.brain:
            return

        print()